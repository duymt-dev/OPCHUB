import { randomUUID } from 'node:crypto';
import { Prisma } from '@opchub/db';
import { normalizeBotBulkLine } from '@opchub/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BotBulkLinesRepository,
  botBulkLineHashes,
  botSavedLineCollisionSql,
  botBatchLineCollisionSql,
} from '@/modules/bot/bulk/bot-bulk-lines.repository';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('D-112 normalized bulk line indexes on native PostgreSQL', () => {
  let t: TestApp;
  const repository = new BotBulkLinesRepository();
  const ids: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.prisma.db.botScript.deleteMany({ where: { id: { in: ids } } });
    await t.close();
  });

  it('matches JavaScript normalization and SHA256 for Vietnamese, Unicode and legacy malformed JSON', async () => {
    const bodies = [
      '  THUẾ: ĐƯỜNG 123! 😀 ',
      'thuế-đường123',
      'Thue',
      'İßΣK',
      'e\u0301',
      'É',
      '?!_',
      '',
      'Xin_chào\nBạn',
    ];
    const rows = await t.prisma.db.$queryRaw<{ body: string; key: string }[]>`
      SELECT body, bot_bulk_line_key(body) AS key FROM unnest(${bodies}::text[]) body`;
    expect(rows.map((row) => row.key)).toEqual(bodies.map(normalizeBotBulkLine));
    const content = bodies.map((body) => ({ personaId: 'p', body }));
    const hashes = await t.prisma.db.$queryRaw<{ hashes: string[] }[]>`
      SELECT bot_script_line_hashes(${JSON.stringify(content)}::jsonb) AS hashes`;
    expect(hashes[0]?.hashes).toEqual(botBulkLineHashes(bodies));
    const malformed = await t.prisma.db.$queryRaw<{ hashes: string[] }[]>`
      SELECT bot_script_line_hashes('{}'::jsonb) AS hashes
      UNION ALL SELECT bot_script_line_hashes('[null,12,{"body":42}]'::jsonb)`;
    expect(malformed).toEqual([{ hashes: [] }, { hashes: [] }]);
  });

  it('tracks saved-line inserts, edits and deletion without an application projection hook', async () => {
    const id = `bulk-lines-${randomUUID()}`;
    const unique = randomUUID();
    ids.push(id);
    const before = `THUẾ, ${unique}!`;
    const after = `Nội dung mới ${unique}`;
    const hashes = botBulkLineHashes([`thuế ${unique}`]);
    await t.prisma.db.botScript.create({
      data: {
        id,
        topic: 'Dedup fixture',
        groupIds: [],
        lines: [{ personaId: 'p', body: before }],
        enabled: false,
      },
    });
    expect(await repository.savedCollision(t.prisma.db, hashes)).toBe(true);
    await t.prisma.db.botScript.update({
      where: { id },
      data: { lines: [{ personaId: 'p', body: after }] },
    });
    expect(await repository.savedCollision(t.prisma.db, hashes)).toBe(false);
    expect(await repository.savedCollision(t.prisma.db, botBulkLineHashes([after]))).toBe(true);
    await t.prisma.db.botScript.delete({ where: { id } });
    expect(await repository.savedCollision(t.prisma.db, botBulkLineHashes([after]))).toBe(false);
    expect(await repository.savedCollision(t.prisma.db, [])).toBe(false);
  });

  it('uses a GIN seek over 10000 wide saved scripts', async () => {
    const prefix = randomUUID();
    // Bulk fixture preparation is not a production interactive transaction.
    // Keep the real queries/assertions; clean only this test's uniquely prefixed rows.
    const tx = t.prisma.db;
    try {
      await tx.$executeRaw`
        INSERT INTO bot_scripts (id, topic, group_ids, lines, enabled, updated_at)
        SELECT ${prefix} || '-script-' || n, 'Saved fixture', ARRAY[]::text[],
          jsonb_build_array(jsonb_build_object('personaId','p','body', ${prefix} || ' saved ' || n || repeat(' wide',100))), false, now()
        FROM generate_series(1,10000) n`;
      await tx.$executeRaw`ANALYZE bot_scripts`;
      const hashes = botBulkLineHashes([`${prefix} saved 8001${' wide'.repeat(100)}`]);
      expect(await repository.savedCollision(tx, hashes)).toBe(true);
      expect(await repository.savedCollision(tx, botBulkLineHashes([`${prefix} absent`]))).toBe(
        false,
      );
      const plan = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`
        EXPLAIN (ANALYZE, BUFFERS) ${botSavedLineCollisionSql(hashes)}`);
      const text = plan.map((row) => row['QUERY PLAN']).join('\n');
      process.stdout.write(`${text}\n`);
      expect(text).toContain('bot_scripts_line_hashes_idx');
      expect(text).not.toMatch(/Seq Scan on bot_scripts/);
    } finally {
      await tx.botScript.deleteMany({ where: { id: { startsWith: `${prefix}-script-` } } });
    }
  });

  it('uses a GIN seek scoped to the batch over 10000 durable wide results', async () => {
    const prefix = randomUUID();
    // Bulk fixture preparation is not a production interactive transaction.
    // Each statement commits independently; precise parent deletion cascades only these fixture rows.
    const tx = t.prisma.db;
    try {
      await tx.$executeRaw`
        INSERT INTO bot_bulk_batches (id,request_id,actor_id,topics,type_name,type_description,per_topic,turns,delay_minutes,group_ids,total,cursor,status,next_at,updated_at)
        SELECT ${prefix} || '-batch-' || n, ${prefix} || '-' || n, ${prefix}, array_fill('Topic'::text,ARRAY[100]),
          'Hỏi đáp','',5,2,5,ARRAY['g'],500,500,'done',NULL,now()
        FROM generate_series(1,20) n`;
      await tx.$executeRaw`
        INSERT INTO bot_bulk_items (id,batch_id,ordinal,topic,lines,line_hashes,updated_at)
        SELECT ${prefix} || '-item-' || n, ${prefix} || '-batch-' || ((n-1)/500+1), (n-1)%500, 'Generated fixture',
          content, bot_script_line_hashes(content), now()
        FROM generate_series(1,10000) n
        CROSS JOIN LATERAL (SELECT jsonb_build_array(
          jsonb_build_object('personaId','p','body', ${prefix} || ' generated ' || n || repeat(' wide',100)),
          jsonb_build_object('personaId','q','body', ${prefix} || ' closing ' || n || repeat(' wide',100))
        ) AS content) payload`;
      await tx.$executeRaw`ANALYZE bot_bulk_items`;
      const hashes = botBulkLineHashes([`${prefix} generated 8001${' wide'.repeat(100)}`]);
      expect(await repository.batchCollision(tx, `${prefix}-batch-17`, hashes)).toBe(true);
      expect(await repository.batchCollision(tx, `${prefix}-batch-16`, hashes)).toBe(false);
      const plan = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(Prisma.sql`
        EXPLAIN (ANALYZE, BUFFERS) ${botBatchLineCollisionSql(`${prefix}-batch-17`, hashes)}`);
      const text = plan.map((row) => row['QUERY PLAN']).join('\n');
      process.stdout.write(`${text}\n`);
      expect(text).toContain('bot_bulk_items_line_hashes_idx');
      expect(text).not.toMatch(/Seq Scan on bot_bulk_items/);
    } finally {
      await tx.botBulkBatch.deleteMany({ where: { actorId: prefix } });
    }
  });
});
