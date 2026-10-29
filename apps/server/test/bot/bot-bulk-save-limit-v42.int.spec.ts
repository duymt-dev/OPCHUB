import { randomUUID } from 'node:crypto';
import { Prisma } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BotBulkControlService } from '@/modules/bot/bulk/bot-bulk-control.service';
import {
  botBulkLineHashes,
  botSavedLineCollisionSql,
} from '@/modules/bot/bulk/bot-bulk-lines.repository';
import { createTestApp, type TestApp } from '../setup/test-app';
import { BulkFixture } from './bulk-fixture';

describe('D-112 maximum 500-script selected save with 4000 distinct lines', () => {
  let t: TestApp;
  let f: BulkFixture;
  const prefix = randomUUID();
  beforeAll(async () => {
    t = await createTestApp();
    f = new BulkFixture(t);
    await f.start();
    await t.prisma.db.$executeRaw`
      INSERT INTO bot_scripts (id,topic,group_ids,lines,enabled,updated_at)
      SELECT ${prefix} || '-existing-' || n, 'Saved fixture', ARRAY[]::text[],
        jsonb_build_array(jsonb_build_object('personaId','p','body', ${prefix} || ' existing ' || n || repeat(' wide',100))), false, now()
      FROM generate_series(1,10000) n`;
    await t.prisma.db.$executeRaw`ANALYZE bot_scripts`;
  });
  afterAll(async () => {
    await f.close();
    await t.prisma.db.botScript.deleteMany({
      where: { id: { startsWith: `${prefix}-existing-` } },
    });
    await t.close();
  });
  it('seeks the saved-line index at maximum input and atomically saves/audits every selected item once', async () => {
    const batch = await f.create({
      topics: Array.from({ length: 100 }, (_, i) => `Topic ${prefix} ${i}`),
      perTopic: 5,
      turns: 8,
    });
    // Storage-boundary fixture only: real provider generation is separately exercised over HTTP.
    const items = Array.from({ length: 500 }, (_, ordinal) => {
      const lines = Array.from({ length: 8 }, (_, line) => ({
        personaId: f.people[line % 2]!,
        body: `${prefix} selected ${ordinal} line ${line}`,
      }));
      return {
        id: randomUUID(),
        batchId: batch.id,
        ordinal,
        topic: `Topic ${ordinal}`,
        lines,
        lineHashes: botBulkLineHashes(lines.map((line) => line.body)),
      };
    });
    await t.prisma.db.botBulkItem.createMany({ data: items });
    await t.prisma.db.botBulkBatch.update({
      where: { id: batch.id },
      data: { status: 'done', cursor: 500, nextAt: null },
    });
    const hashes = items.flatMap((item) => item.lineHashes);
    const sql = botSavedLineCollisionSql(hashes);
    const plan = await t.prisma.db.$queryRaw<{ 'QUERY PLAN': string }[]>(
      Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) ${sql}`,
    );
    const text = plan.map((row) => row['QUERY PLAN']).join('\n');
    process.stdout.write(`${text}\n`);
    expect(text).toContain('bot_scripts_line_hashes_idx');
    expect(text).not.toMatch(/Seq Scan on bot_scripts/);
    expect(await t.prisma.db.$queryRaw(sql)).toEqual([{ collision: false }]);
    const control = t.app.get(BotBulkControlService);
    const result = await control.save(f.actor, batch.id);
    expect(result.saved).toBe(500);
    expect(new Set(result.scriptIds).size).toBe(500);
    expect(
      await t.prisma.db.botBulkItem.count({
        where: { batchId: batch.id, savedScriptId: { not: null } },
      }),
    ).toBe(500);
    expect(
      await t.prisma.db.auditLog.count({
        where: { actorId: f.actor.id, action: 'script.create', entityId: { in: result.scriptIds } },
      }),
    ).toBe(500);
    expect(await control.save(f.actor, batch.id)).toEqual({ saved: 0, scriptIds: [] });
    expect(await t.prisma.db.$queryRaw(sql)).toEqual([{ collision: true }]);
  });
});
