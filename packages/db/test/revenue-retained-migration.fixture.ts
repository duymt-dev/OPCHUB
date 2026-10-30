import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Prisma, type DbClient, type DbTx } from '../src';
import { prepareRevenueMigration } from './revenue-sharing-migration.fixture';

const directory = join(__dirname, '../prisma/migrations/20261031100000_v46_revenue_retained');
export const retainedMigration = readFileSync(join(directory, 'migration.sql'), 'utf8');
export const retainedDown = readFileSync(join(directory, 'down.sql'), 'utf8');

export async function applyRetainedMigration(tx: DbTx) {
  // Actual migration SQL, preserving function bodies. Caller already owns the transaction.
  for (const part of retainedMigration.split('-- statement-break')) {
    const sql = part
      .replace(/^BEGIN;$/m, '')
      .replace(/^COMMIT;$/m, '')
      .trim();
    if (sql) await tx.$executeRaw(Prisma.raw(sql));
  }
}

export async function prepareRetainedMigration(db: DbClient) {
  await prepareRevenueMigration(db);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL search_path TO mig_v46_802, public`;
    await tx.$executeRaw`CREATE TABLE stats_daily (day date NOT NULL, metric text NOT NULL,
      dimension text NOT NULL DEFAULT '', value bigint NOT NULL,
      PRIMARY KEY (day, metric, dimension))`;
    await applyRetainedMigration(tx);
  });
}

export const retainedInsert = (
  id: string,
  affiliate: string | null = 'affiliate',
  at = '2025-01-31T17:00:00Z',
  amount = 101,
) => Prisma.sql`
  INSERT INTO mig_v46_802.revenue_shares (
    id, source, source_id, plan, customer_id, affiliate_id, region, director_id, director_name,
    received_at, recorded_at, first_received_at, customer_year, amount,
    year_one_rate, annual_decrease, minimum_rate, director_rate, director_amount,
    media_soft_amount, month_key
  ) VALUES (
    ${id}, 'membership', ${id}, 'personal', 'cross', ${affiliate}, NULL, NULL, NULL,
    ${at}::timestamptz, ${at}::timestamptz, ${at}::timestamptz, 1, ${amount},
    50, 10, 20, 0, 0, ${amount}, '2025-02'
  ) ON CONFLICT (source, source_id) DO NOTHING`;

export const retainedRows = (db: DbClient | DbTx) =>
  db.$queryRaw<{ day: Date; dimension: string; value: bigint }[]>`
    SELECT day, dimension, value FROM mig_v46_802.stats_daily
    WHERE metric = 'affiliate_revenue_retained' AND value <> 0 ORDER BY day, dimension`;
