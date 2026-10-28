import { randomUUID } from 'node:crypto';
import { Prisma } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { botBulkPersonasSql } from '@/modules/bot/bulk/bot-bulk-personas.repository';
import { botBulkItemsSql, botBulkRecoverySql } from '@/modules/bot/bulk/bot-bulk.repository';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('D-112 bounded bulk plans over native 10000-row catalogs', () => {
  let t: TestApp;
  const prefix = randomUUID();
  const now = new Date('2040-01-01T00:00:00Z');
  const batchId = `${prefix}-batch-17`;
  beforeAll(async () => {
    t = await createTestApp();
    // Wide fixture setup uses standalone statements, not a five-second interactive transaction.
    await t.prisma.db.$executeRaw`
      INSERT INTO personas (id,name,bio,skills,group_ids,enabled,updated_at)
      SELECT ${prefix} || '-persona-' || n, 'Plan persona', repeat('bio ',500), repeat('skills ',500),
        ARRAY[CASE WHEN n IN (8001,8002) THEN ${prefix} ELSE 'other-plan-group' END], true, now()
      FROM generate_series(1,10000) n`;
    await t.prisma.db.$executeRaw`
      INSERT INTO bot_bulk_batches (id,request_id,actor_id,topics,type_name,type_description,per_topic,turns,delay_minutes,group_ids,total,cursor,status,next_at,updated_at)
      SELECT ${prefix} || '-batch-' || n, ${prefix} || '-request-' || n, ${prefix}, array_fill('Topic'::text,ARRAY[100]),
        'Plan type',repeat('description ',100),5,2,5,ARRAY['g'],500,
        CASE WHEN n <= 20 THEN 500 ELSE 0 END,
        CASE WHEN n <= 20 THEN 'done' ELSE 'running' END,
        CASE WHEN n <= 20 THEN NULL WHEN n <= 25 THEN ${now}::timestamptz - interval '1 second' ELSE ${now}::timestamptz + interval '1 day' END, now()
      FROM generate_series(1,10000) n`;
    await t.prisma.db.$executeRaw`
      INSERT INTO bot_bulk_items (id,batch_id,ordinal,topic,lines,line_hashes,updated_at)
      SELECT ${prefix} || '-item-' || n, ${prefix} || '-batch-' || ((n-1)/500+1), (n-1)%500, 'Plan topic',
        content, bot_script_line_hashes(content), now()
      FROM generate_series(1,10000) n
      CROSS JOIN LATERAL (SELECT jsonb_build_array(
        jsonb_build_object('personaId','p','body', ${prefix} || ' opening ' || n || repeat(' wide',100)),
        jsonb_build_object('personaId','p','body', ${prefix} || ' closing ' || n || repeat(' wide',100))
      ) AS content) payload`;
    await t.prisma.db.$executeRaw`ANALYZE personas`;
    await t.prisma.db.$executeRaw`ANALYZE bot_bulk_batches`;
    await t.prisma.db.$executeRaw`ANALYZE bot_bulk_items`;
  });
  afterAll(async () => {
    await t.prisma.db.botBulkBatch.deleteMany({ where: { actorId: prefix } });
    await t.prisma.db.persona.deleteMany({ where: { id: { startsWith: `${prefix}-persona-` } } });
    await t.close();
  });
  async function explain(sql: Prisma.Sql) {
    const rows = await t.prisma.db.$queryRaw<{ 'QUERY PLAN': string }[]>(
      Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${sql}`,
    );
    const text = rows.map((row) => row['QUERY PLAN']).join('\n');
    process.stdout.write(`${text}\n`);
    return text;
  }
  it('seeks group memberships and fallback IDs before loading at most eight wide profiles', async () => {
    const sql = botBulkPersonasSql([prefix]);
    const rows = await t.prisma.db.$queryRaw<{ id: string }[]>(sql);
    expect(rows).toHaveLength(8);
    expect(rows.slice(0, 2).map((row) => row.id)).toEqual([
      `${prefix}-persona-8001`,
      `${prefix}-persona-8002`,
    ]);
    const plan = await explain(sql);
    expect(plan).toContain('personas_bulk_groups_idx');
    expect(plan).toContain('personas_bulk_enabled_idx');
    expect(plan).not.toMatch(/Seq Scan on personas/);
  });
  it('seeks a deep ordinal cursor and joins only the selected page payloads', async () => {
    const sql = botBulkItemsSql(batchId, { after: 399, limit: 20 });
    const rows = await t.prisma.db.$queryRaw<{ ordinal: number }[]>(sql);
    expect(rows.map((row) => row.ordinal)).toEqual(Array.from({ length: 21 }, (_, i) => i + 400));
    const plan = await explain(sql);
    expect(plan).toContain('bot_bulk_items_batch_id_ordinal_key');
    expect(plan).toContain('bot_bulk_items_pkey');
    expect(plan).not.toMatch(/Seq Scan on bot_bulk_items/);
  });
  it('recovers only due running cursors via equality then next-at seek', async () => {
    const sql = botBulkRecoverySql(now);
    const rows = await t.prisma.db.$queryRaw<{ id: string }[]>(sql);
    expect(rows.filter((row) => row.id.startsWith(prefix)).map((row) => row.id)).toEqual(
      Array.from({ length: 5 }, (_, i) => `${prefix}-batch-${i + 21}`),
    );
    expect(rows.length).toBeLessThanOrEqual(30);
    const plan = await explain(sql);
    expect(plan).toContain('bot_bulk_batches_status_next_at_id_idx');
    expect(plan).not.toMatch(/Seq Scan on bot_bulk_batches/);
  });
});
