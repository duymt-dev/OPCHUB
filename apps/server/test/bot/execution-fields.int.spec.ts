import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../setup/test-app';

const threadData = (id = randomUUID()) => ({
  id,
  topic: 'Execution storage fixture',
  groupIds: ['c1'],
  lines: [
    { personaId: 'ps1', body: 'Lượt thứ nhất' },
    { personaId: 'ps2', body: 'Lượt thứ hai' },
  ],
});

describe('REQ-208 REQ-411 bot execution storage expansion', () => {
  let t: TestApp;
  const ids: string[] = [];
  const scripts: string[] = [];
  const prefix = `bot-plan-${randomUUID()}-`;
  const now = new Date('2026-10-21T05:00:00Z');
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.prisma.db.botThread.deleteMany({
      where: { OR: [{ id: { in: ids } }, { id: { startsWith: prefix } }] },
    });
    await t.prisma.db.botScript.deleteMany({
      where: { OR: [{ id: { in: scripts } }, { id: { startsWith: prefix } }] },
    });
    await t.close();
  });

  it('REQ-208 expansion does not schedule legacy API writes; timestamps round-trip in UTC', async () => {
    const data = threadData();
    ids.push(data.id);
    const row = await t.prisma.db.botThread.create({ data });
    expect(row.status).toBe('pending');
    expect(row.nextAt).toBeNull();
    expect(row.cursor).toBe(0);
    expect(row.personaQueue).toEqual([]);
    expect(row.kind).toBe('script');
    expect(row.triggerMessageId).toBeNull();
    const updated = await t.prisma.db.botThread.update({
      where: { id: row.id },
      data: { nextAt: now, personaQueue: ['ps1', 'ps2'] },
    });
    expect(updated.nextAt?.toISOString()).toBe(now.toISOString());
    const scriptId = randomUUID();
    scripts.push(scriptId);
    const script = await t.prisma.db.botScript.create({
      data: {
        id: scriptId,
        topic: 'Schedule fixture',
        groupIds: ['c1'],
        lines: data.lines,
        runAt: now,
        lastRunAt: now,
      },
    });
    expect(script.lastRunAt?.toISOString()).toBe(now.toISOString());
  });

  it('REQ-208 exact migration backfill preserves posted snapshot order/history and leaves pending turns unscheduled', async () => {
    const sql = readFileSync(
      new URL(
        '../../../../packages/db/prisma/migrations/20261021023000_bot_execution_fields/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    const backfill = /UPDATE "bot_threads" t SET[\s\S]*?;\n/.exec(sql)?.[0];
    if (!backfill) throw new Error('Missing migration backfill SQL');
    const posted = threadData();
    const pending = threadData();
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        await tx.botThread.create({
          data: {
            ...posted,
            status: 'posted',
            isAuto: true,
            postedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        });
        await tx.botThread.create({ data: pending });
        await tx.$executeRaw(Prisma.raw(backfill));
        const done = await tx.botThread.findUniqueOrThrow({ where: { id: posted.id } });
        expect(done.cursor).toBe(2);
        expect(done.personaQueue).toEqual(['ps1', 'ps2']);
        expect(done.kind).toBe('auto');
        expect(done.postedAt?.toISOString()).toBe(now.toISOString());
        expect(done.updatedAt.toISOString()).toBe(now.toISOString());
        const queued = await tx.botThread.findUniqueOrThrow({ where: { id: pending.id } });
        expect(queued.cursor).toBe(0);
        expect(queued.nextAt).toBeNull();
        expect(queued.personaQueue).toEqual(['ps1', 'ps2']);
        throw new Error('Rollback backfill fixture');
      }),
    ).rejects.toThrow('Rollback backfill fixture');
    expect(
      await t.prisma.db.botThread.count({ where: { id: { in: [posted.id, pending.id] } } }),
    ).toBe(0);
  });

  it('REQ-411 unique trigger prevents a second reply thread while null script triggers coexist', async () => {
    const trigger = `synthetic-trigger-${randomUUID()}`;
    const one = threadData();
    const two = threadData();
    const plain = threadData();
    ids.push(one.id, two.id, plain.id);
    await t.prisma.db.botThread.create({
      data: { ...one, kind: 'reply', triggerMessageId: trigger },
    });
    await expect(
      t.prisma.db.botThread.create({ data: { ...two, kind: 'reply', triggerMessageId: trigger } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await t.prisma.db.botThread.create({ data: plain });
    expect(
      (await t.prisma.db.botThread.findUniqueOrThrow({ where: { triggerMessageId: trigger } })).id,
    ).toBe(one.id);
  });

  it('REQ-208 DB rejects negative cursors and unknown execution kinds', async () => {
    const negative = threadData();
    const invalid = threadData();
    ids.push(negative.id, invalid.id);
    await expect(
      t.prisma.db.botThread.create({ data: { ...negative, cursor: -1 } }),
    ).rejects.toThrow();
    await expect(
      t.prisma.db.botThread.create({ data: { ...invalid, kind: 'unknown' } }),
    ).rejects.toThrow();
    expect(
      await t.prisma.db.botThread.count({ where: { id: { in: [negative.id, invalid.id] } } }),
    ).toBe(0);
  });

  it('REQ-208 due-thread and scheduled-script indexes cover IDs/cursor without scanning 10k wide rows', async () => {
    await t.prisma.db.$executeRaw`
      INSERT INTO bot_threads (id, topic, group_ids, lines, status, next_at, created_at, updated_at)
      SELECT ${prefix} || n::text, 'query plan fixture', ARRAY['c1'],
        jsonb_build_array(jsonb_build_object('personaId', 'ps1', 'body', repeat('wide ', 400))),
        CASE WHEN n = 1 THEN 'pending'::bot_thread_status ELSE 'posted'::bot_thread_status END,
        CASE WHEN n = 1 THEN ${now}::timestamptz ELSE NULL END, ${now}, ${now}
      FROM generate_series(1, 10001) n`;
    await t.prisma.db.$executeRaw`
      INSERT INTO bot_scripts (id, topic, group_ids, lines, run_at, created_at, updated_at)
      SELECT ${prefix} || n::text, 'query plan fixture', ARRAY['c1'],
        jsonb_build_array(jsonb_build_object('personaId', 'ps1', 'body', repeat('wide ', 400))),
        CASE WHEN n = 1 THEN ${now}::timestamptz ELSE NULL END, ${now}, ${now}
      FROM generate_series(1, 10001) n`;
    await t.prisma.db.$executeRaw`ANALYZE bot_threads`;
    await t.prisma.db.$executeRaw`ANALYZE bot_scripts`;
    const threads = await t.prisma.db.$queryRaw<{ 'QUERY PLAN': string }[]>`
      EXPLAIN (ANALYZE, BUFFERS) SELECT id, cursor FROM bot_threads
      WHERE status = 'pending' AND next_at <= ${now}
      ORDER BY next_at, id LIMIT 10`;
    const scheduled = await t.prisma.db.$queryRaw<{ 'QUERY PLAN': string }[]>`
      EXPLAIN (ANALYZE, BUFFERS) SELECT id, last_run_at FROM bot_scripts
      WHERE enabled AND run_at <= ${now} ORDER BY run_at, id LIMIT 10`;
    const threadPlan = threads.map((row) => row['QUERY PLAN']).join('\n');
    const scriptPlan = scheduled.map((row) => row['QUERY PLAN']).join('\n');
    expect(threadPlan).toContain('Index Only Scan using bot_threads_execution_due_idx');
    expect(scriptPlan).toContain('Index Only Scan using bot_scripts_schedule_due_idx');
    expect(threadPlan).not.toContain('Seq Scan');
    expect(scriptPlan).not.toContain('Seq Scan');
    process.stdout.write(
      `REQ-208 10001 wide threads / 10001 wide scripts EXPLAIN:\n${threadPlan}\n${scriptPlan}\n`,
    );
  });
});
