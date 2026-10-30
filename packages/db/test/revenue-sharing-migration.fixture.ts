import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Prisma, type DbClient } from '../src';

export const SCHEMA = 'mig_v46_802';
export const migration = readFileSync(
  join(__dirname, '../prisma/migrations/20261031040000_v46_revenue_sharing/migration.sql'),
  'utf8',
);
const anchorMigration = readFileSync(
  join(__dirname, '../prisma/migrations/20261031060000_v46_revenue_reanchor/migration.sql'),
  'utf8',
);
const bankMigration = readFileSync(
  join(__dirname, '../prisma/migrations/20261031070000_v46_revenue_recipient_bank/migration.sql'),
  'utf8',
);

/** Isolated schema on opchub_test only; no reset of public/native-HOLD data. */
export async function prepareRevenueMigration(db: DbClient) {
  await db.$executeRaw`DROP SCHEMA IF EXISTS mig_v46_802 CASCADE`;
  await db.$executeRaw`CREATE SCHEMA mig_v46_802`;
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL search_path TO mig_v46_802, public`;
    const setup = `
      CREATE TYPE commission_source AS ENUM ('membership', 'fundraising');
      CREATE TYPE commission_plan AS ENUM ('personal', 'business', 'fundraising');
      CREATE TYPE region AS ENUM ('north', 'central', 'south');
      CREATE TABLE users (id text PRIMARY KEY);
      CREATE TABLE affiliate_policy (id integer PRIMARY KEY, default_rate integer NOT NULL);
      CREATE TABLE payment_transactions (id text PRIMARY KEY, amount integer NOT NULL,
        match_status text NOT NULL, received_at timestamptz NOT NULL);
      CREATE TABLE membership_fee_periods (id text PRIMARY KEY, user_id text NOT NULL,
        amount integer NOT NULL, source text NOT NULL, payment_transaction_id text,
        created_at timestamptz NOT NULL, starts_at timestamptz NOT NULL);
      CREATE TABLE project_fundraisings (id text PRIMARY KEY, owner_id text NOT NULL,
        amount integer NOT NULL, legacy boolean NOT NULL, payment_transaction_id text,
        paid_at timestamptz, status text NOT NULL);
      INSERT INTO affiliate_policy VALUES (1, 23);
      INSERT INTO users VALUES ('cross'), ('manual'), ('zero'), ('ignored'), ('unmatched'),
        ('legacy'), ('unpaid'), ('first-member'), ('rejected-review'), ('trial'), ('zero-bank');
      INSERT INTO payment_transactions VALUES
        ('member', 100, 'matched', '2025-04-01T00:00:00Z'),
        ('fund', 80, 'manual', '2024-01-31T17:00:00Z'),
        ('ignore', 100, 'ignored', '2020-01-01T00:00:00Z'),
        ('unmatch', 100, 'unmatched', '2020-01-01T00:00:00Z'),
        ('zero', 0, 'matched', '2020-01-01T00:00:00Z');
      INSERT INTO membership_fee_periods VALUES
        ('p1','cross',100,'transfer','member','2025-04-02','2026-04-02'),
        ('p2','manual',70,'manual',NULL,'2024-07-08','2025-07-08'),
        ('p3','zero',0,'manual',NULL,'2020-01-01','2020-01-01'),
        ('p4','ignored',100,'manual','ignore','2020-01-01','2020-01-01'),
        ('p5','unmatched',100,'transfer','unmatch','2020-01-01','2020-01-01'),
        ('p6','first-member',100,'manual',NULL,'2023-06-01','2023-06-01'),
        ('p7','zero-bank',100,'manual','zero','2020-01-01','2020-01-01');
      INSERT INTO project_fundraisings VALUES
        ('f1','cross',100,false,'fund','2024-02-03','pending_review'),
        ('f2','legacy',100,true,'fund','2024-02-03','active'),
        ('f3','unpaid',100,false,'fund',NULL,'pending_payment'),
        ('f4','first-member',100,false,'fund','2024-02-03','active'),
        ('f5','rejected-review',100,false,'fund','2024-02-03','rejected'),
        ('f6','ignored',100,false,'ignore','2024-02-03','active'),
        ('f7','zero-bank',100,false,'zero','2024-02-03','active');
    `;
    // Static migration/fixture statements, never input-built SQL. DDL needs sequential execution.
    for (const sql of `${setup}\n${migration}\n${anchorMigration}\n${bankMigration}`.split(
      /;\s*(?:\n|$)/,
    )) {
      const statement = sql.trim();
      if (statement) await tx.$executeRaw(Prisma.raw(statement));
    }
  });
}

export const shareInsert = (id = 'share') => Prisma.sql`
  INSERT INTO mig_v46_802.revenue_shares (
    id, source, source_id, plan, customer_id, affiliate_id, region, director_id, director_name,
    received_at, recorded_at, first_received_at, customer_year, amount,
    year_one_rate, annual_decrease, minimum_rate, director_rate, director_amount, media_soft_amount, month_key
  ) VALUES (
    ${id}, 'membership', 'period', 'personal', 'cross', 'affiliate', 'north', 'former-director', 'Director',
    '2025-01-01', '2025-01-02', '2025-01-01', 1, 101, 50, 10, 20, 50, 51, 50, '2025-01'
  )`;
