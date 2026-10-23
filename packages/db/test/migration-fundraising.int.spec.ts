import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V4-610 (D-70, D-82, Q-V4-610-2): chạy migration `v4_fundraising` trên schema tạm có cấu trúc
 * trước — dự án đã khai báo gọi vốn có khoản Gọi vốn `active` legacy; hoa hồng phí thành viên cũ
 * giữ nguyên; một người được giới thiệu có thêm hoa hồng Gọi vốn, nhưng vẫn chỉ một khoản phí.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const S = 'mig_v4_610';
const SQL = readFileSync(
  join(__dirname, '../prisma/migrations/20261024120000_v4_fundraising/migration.sql'),
  'utf8',
);

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

const BEFORE = [
  `CREATE SCHEMA ${S}`,
  `CREATE TYPE ${S}.mail_kind AS ENUM ('otp', 'service')`,
  `CREATE TYPE ${S}.commission_source AS ENUM ('membership', 'fundraising')`,
  `CREATE TABLE ${S}.users (id text PRIMARY KEY)`,
  `CREATE TABLE ${S}.payment_transactions (id text PRIMARY KEY)`,
  `CREATE TABLE ${S}.projects (id text PRIMARY KEY, owner_id text NOT NULL, deleted_at timestamptz)`,
  `CREATE TABLE ${S}.project_fundings (project_id text PRIMARY KEY)`,
  `CREATE TABLE ${S}.commissions (id text PRIMARY KEY, referred_user_id text NOT NULL,
     fee_period_id text NOT NULL, source ${S}.commission_source NOT NULL DEFAULT 'membership',
     amount integer NOT NULL)`,
  `CREATE UNIQUE INDEX commissions_referred_user_id_key ON ${S}.commissions (referred_user_id)`,
  `INSERT INTO ${S}.users VALUES ('u1'), ('u2')`,
  `INSERT INTO ${S}.projects VALUES ('p1', 'u1', NULL), ('p2', 'u2', NULL), ('p3', 'u2', now())`,
  `INSERT INTO ${S}.project_fundings VALUES ('p1'), ('p3')`,
  `INSERT INTO ${S}.commissions (id, referred_user_id, fee_period_id, amount)
     VALUES ('c1', 'u1', 'fp1', 240000)`,
];

describe('migration Gói Gọi vốn (TIP-V4-610)', () => {
  beforeAll(async () => {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${S} CASCADE`);
    for (const s of BEFORE) await db.$executeRawUnsafe(s);
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO ${S}, public`);
      for (const s of statements(SQL)) await tx.$executeRawUnsafe(s);
    });
  });
  afterAll(async () => {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${S} CASCADE`);
    await db.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS ${S}.fundraising_code_seq`);
    await db.$disconnect();
  });

  it('dự án đang khai báo gọi vốn (chưa xoá) có khoản active legacy 6 tháng, amount 0', async () => {
    const rows = await db.$queryRawUnsafe<
      { project_id: string; status: string; legacy: boolean; amount: number; months: number }[]
    >(
      `SELECT project_id, status::text AS status, legacy, amount,
         round(extract(epoch FROM ends_at - starts_at) / 86400 / 30)::int AS months
       FROM ${S}.project_fundraisings ORDER BY project_id`,
    );
    expect(rows).toEqual([
      { project_id: 'p1', status: 'active', legacy: true, amount: 0, months: 6 },
    ]);
  });

  it('một khoản mở / dự án; mã phải GV + 6 số', async () => {
    const ins = (id: string, code: string, status: string) =>
      db.$executeRawUnsafe(
        `INSERT INTO ${S}.project_fundraisings (id, project_id, owner_id, code, amount, status, updated_at)
         VALUES ('${id}', 'p2', 'u2', '${code}', 15000000, '${status}', now())`,
      );
    await ins('f1', 'GV000001', 'pending_payment');
    await expect(ins('f2', 'GV000002', 'pending_review')).rejects.toThrow(
      /project_fundraisings_open/,
    );
    await expect(ins('f3', 'XX1', 'rejected')).rejects.toThrow(/project_fundraisings_code_check/);
  });

  it('hoa hồng cũ giữ; thêm được hoa hồng Gọi vốn cho cùng người; phí vẫn một khoản', async () => {
    const [old] = await db.$queryRawUnsafe<{ amount: number; source: string }[]>(
      `SELECT amount, source::text AS source FROM ${S}.commissions WHERE id = 'c1'`,
    );
    expect(old).toEqual({ amount: 240000, source: 'membership' });
    await db.$executeRawUnsafe(
      `INSERT INTO ${S}.commissions (id, referred_user_id, fundraising_id, source, amount)
       VALUES ('c2', 'u1', (SELECT id FROM ${S}.project_fundraisings WHERE project_id = 'p1'),
               'fundraising', 1500000)`,
    );
    await expect(
      db.$executeRawUnsafe(
        `INSERT INTO ${S}.commissions (id, referred_user_id, fee_period_id, amount)
         VALUES ('c3', 'u1', 'fp2', 1)`,
      ),
    ).rejects.toThrow(/commissions_membership_referred_key/);
    await expect(
      db.$executeRawUnsafe(
        `INSERT INTO ${S}.commissions (id, referred_user_id, source, amount)
         VALUES ('c4', 'u2', 'fundraising', 1)`,
      ),
    ).rejects.toThrow(/commissions_source_key_check/);
  });
});
