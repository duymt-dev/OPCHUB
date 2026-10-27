import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V42-702 (D-94 2A, D-116): chạy migration `v42_trial_backfill` trên schema tạm có cấu trúc trước
 * V4.2 — khoản `pending_payment` cũ → trial đến ngày đăng ký + 90 ngày, đã quá → expired, giá gói hiện hành.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const S = 'mig_v42_702';
const SQL = readFileSync(
  join(__dirname, '../prisma/migrations/20261028090100_v42_trial_backfill/migration.sql'),
  'utf8',
);
const DAY = 86_400_000;

const statements = (sql: string) =>
  sql
    .split(/;\s*\n/)
    .map((s) =>
      s
        .split('\n')
        .filter((l) => !l.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter(Boolean);

const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();

const BEFORE = [
  `CREATE SCHEMA ${S}`,
  `CREATE TYPE ${S}.membership_fee_status AS ENUM ('trial', 'pending_payment', 'active', 'expiring', 'expired')`,
  `CREATE TABLE ${S}.users (id text PRIMARY KEY, created_at timestamptz NOT NULL)`,
  `CREATE TABLE ${S}.membership_fees (user_id text PRIMARY KEY, plan text NOT NULL,
     status ${S}.membership_fee_status NOT NULL DEFAULT 'pending_payment', amount integer NOT NULL,
     valid_until timestamptz, version integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX membership_fees_due ON ${S}.membership_fees (valid_until) WHERE status IN ('active', 'expiring')`,
  `INSERT INTO ${S}.users VALUES ('u10', '${ago(10)}'), ('u200', '${ago(200)}'), ('ua', '${ago(400)}')`,
  `INSERT INTO ${S}.membership_fees (user_id, plan, status, amount, valid_until) VALUES
     ('u10', 'personal', 'pending_payment', 600000, NULL),
     ('u200', 'business', 'pending_payment', 600000, NULL),
     ('ua', 'personal', 'active', 1200000, '${new Date(Date.now() + 100 * DAY).toISOString()}')`,
];

describe('migration trial D-94 2A / D-116 (TIP-V42-702)', () => {
  beforeAll(async () => {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${S} CASCADE`);
    for (const s of BEFORE) await db.$executeRawUnsafe(s);
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO ${S}`);
      for (const s of statements(SQL)) await tx.$executeRawUnsafe(s);
    });
  });
  afterAll(async () => {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${S} CASCADE`);
    await db.$disconnect();
  });

  const row = async (id: string) => {
    const [r] = await db.$queryRawUnsafe<
      { status: string; amount: number; valid_until: Date | null; version: number }[]
    >(
      `SELECT status::text AS status, amount, valid_until, version FROM ${S}.membership_fees
       WHERE user_id = '${id}'`,
    );
    return r!;
  };

  it('đăng ký 10 ngày trước → trial đến ngày đăng ký + 90, giá gói hiện hành, bump version', async () => {
    const r = await row('u10');
    expect(r.status).toBe('trial');
    expect(r.amount).toBe(1_200_000);
    expect(r.version).toBe(1);
    expect(Math.abs(r.valid_until!.getTime() - (Date.now() + 80 * DAY))).toBeLessThan(60_000);
  });

  it('đăng ký 200 ngày trước → expired, bỏ khoản 600.000 (giá DN 3.600.000)', async () => {
    const r = await row('u200');
    expect(r.status).toBe('expired');
    expect(r.amount).toBe(3_600_000);
    expect(r.valid_until).not.toBeNull();
  });

  it('khoản đã trả không đổi; trạng thái mặc định = trial; index quét gồm trial', async () => {
    expect(await row('ua')).toMatchObject({ status: 'active', amount: 1_200_000, version: 0 });
    const [d] = await db.$queryRawUnsafe<{ d: string }[]>(
      `SELECT column_default AS d FROM information_schema.columns
       WHERE table_schema = '${S}' AND table_name = 'membership_fees' AND column_name = 'status'`,
    );
    expect(d!.d).toContain('trial');
    const [ix] = await db.$queryRawUnsafe<{ def: string }[]>(
      `SELECT indexdef AS def FROM pg_indexes WHERE schemaname = '${S}' AND indexname = 'membership_fees_due'`,
    );
    expect(ix!.def).toContain('trial');
  });
});
