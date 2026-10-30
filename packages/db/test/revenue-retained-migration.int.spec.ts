import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../src';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';
import {
  applyRetainedMigration,
  prepareRetainedMigration,
  retainedDown,
  retainedInsert,
  retainedRows,
} from './revenue-retained-migration.fixture';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 3 });
describe('REQ-617 transactionally maintained retained revenue read-model', () => {
  beforeAll(async () => prepareRetainedMigration(db));
  beforeEach(async () => {
    await db.$executeRaw`DELETE FROM mig_v46_802.revenue_shares`;
  });
  afterAll(async () => {
    await db.$executeRaw`DROP SCHEMA IF EXISTS mig_v46_802 CASCADE`;
    await db.$disconnect();
  });

  it('D-121 includes vacant attribution but keeps direct registrations in a separate scope', async () => {
    await db.$executeRaw(retainedInsert('attributed'));
    await db.$executeRaw(retainedInsert('direct', null));
    expect(await retainedRows(db)).toEqual([
      { day: new Date('2025-02-01'), dimension: 'all', value: 202n },
      { day: new Date('2025-02-01'), dimension: 'attributed', value: 101n },
    ]);
  });

  it('D-119 deduplicates replays/concurrent receipts and keeps bigint daily totals', async () => {
    await Promise.all([
      db.$executeRaw(retainedInsert('one', 'affiliate', undefined, 2_000_000_000)),
      db.$executeRaw(retainedInsert('two', 'affiliate', undefined, 2_000_000_000)),
      db.$executeRaw(retainedInsert('one', 'affiliate', undefined, 2_000_000_000)),
    ]);
    expect((await retainedRows(db)).map((r) => r.value)).toEqual([4_000_000_000n, 4_000_000_000n]);
  });

  it('tracks changed snapshots/day/attribution with signed deltas, without double counting', async () => {
    await db.$executeRaw(retainedInsert('update'));
    await db.$executeRaw`UPDATE mig_v46_802.revenue_shares
      SET amount = 201, media_soft_amount = 201, affiliate_id = NULL,
        received_at = '2025-02-02T17:00:00Z', updated_at = now() WHERE id = 'update'`;
    expect(await retainedRows(db)).toEqual([
      { day: new Date('2025-02-03'), dimension: 'all', value: 201n },
    ]);
    await db.$executeRaw`UPDATE mig_v46_802.revenue_shares SET updated_at = now()`;
    expect((await retainedRows(db)).map((r) => r.value)).toEqual([201n]);
  });

  it('rollback and bulk deletion/reset leave no lost or phantom retained revenue', async () => {
    const rollback = new Error('rollback');
    await expect(
      db.$transaction(async (tx) => {
        await tx.$executeRaw(retainedInsert('rolled-back'));
        expect((await retainedRows(tx)).map((r) => r.value)).toEqual([101n, 101n]);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
    expect(await retainedRows(db)).toEqual([]);
    await db.$executeRaw(retainedInsert('deleted'));
    await db.$executeRaw`DELETE FROM mig_v46_802.revenue_shares`;
    expect(await retainedRows(db)).toEqual([]);
    await db.$executeRaw(retainedInsert('truncated'));
    await db.$executeRaw`TRUNCATE mig_v46_802.revenue_shares`;
    expect(await retainedRows(db)).toEqual([]);
  });

  it('bulk statement deltas aggregate each day/scope once and preserve unrelated reporting rows', async () => {
    await db.$executeRaw`INSERT INTO mig_v46_802.stats_daily VALUES
      ('2025-02-01', 'members_total', '', 77) ON CONFLICT DO NOTHING`;
    await db.$executeRaw(retainedInsert('bulk-source'));
    await db.$executeRaw`INSERT INTO mig_v46_802.revenue_shares
      SELECT (jsonb_populate_record(NULL::mig_v46_802.revenue_shares,
        to_jsonb(s) || jsonb_build_object('id', 'bulk-' || n, 'source_id', 'bulk-' || n))).*
      FROM mig_v46_802.revenue_shares s CROSS JOIN generate_series(1, 10000) n
      WHERE s.id = 'bulk-source'`;
    expect((await retainedRows(db)).map((r) => r.value)).toEqual([1_010_101n, 1_010_101n]);
    await db.$executeRaw`TRUNCATE mig_v46_802.revenue_shares`;
    const rows = await db.$queryRaw<{ value: bigint }[]>`
      SELECT value FROM mig_v46_802.stats_daily WHERE metric = 'members_total'`;
    expect(rows).toEqual([{ value: 77n }]);
  });

  it('actual down/up SQL backfills existing snapshots, not legacy receipts, atomically', async () => {
    const rollback = new Error('keep migration installed');
    await db.$executeRaw(retainedInsert('backfill'));
    await expect(
      db.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL search_path TO mig_v46_802, public`;
        for (const statement of retainedDown.split(';')) {
          const sql = statement.trim();
          if (sql && sql !== 'BEGIN' && sql !== 'COMMIT') await tx.$executeRaw(Prisma.raw(sql));
        }
        expect(await retainedRows(tx)).toEqual([]);
        await applyRetainedMigration(tx);
        expect((await retainedRows(tx)).map((r) => r.value)).toEqual([101n, 101n]);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
    expect((await retainedRows(db)).map((r) => r.value)).toEqual([101n, 101n]);
  });
});
