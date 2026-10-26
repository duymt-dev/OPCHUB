import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V4-602 (D-70): chạy migration `v4_commission_actual_fee` trên schema tạm có cấu trúc trước V4 —
 * hoa hồng cũ giữ số tiền, nguồn = membership; chính sách thêm % Gọi vốn mặc định 10.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const S = 'mig_v4_602';
const SQL = readFileSync(
  join(__dirname, '../prisma/migrations/20261023200000_v4_commission_actual_fee/migration.sql'),
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
  `CREATE TABLE ${S}.commissions (id text PRIMARY KEY, list_amount integer NOT NULL,
     amount integer NOT NULL, rate integer NOT NULL)`,
  `CREATE TABLE ${S}.affiliate_policy (id integer PRIMARY KEY, default_rate integer NOT NULL DEFAULT 20,
     cookie_days integer NOT NULL DEFAULT 30, terms text NOT NULL DEFAULT '')`,
  `INSERT INTO ${S}.commissions VALUES ('c1', 600000, 120000, 20), ('c2', 1200000, 276000, 23)`,
  `INSERT INTO ${S}.affiliate_policy (id, default_rate) VALUES (1, 25)`,
];

describe('migration D-70 nguồn hoa hồng + % Gọi vốn (TIP-V4-602)', () => {
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

  it('hoa hồng cũ giữ nguyên số tiền, nguồn = membership', async () => {
    const rows = await db.$queryRawUnsafe<
      { id: string; list_amount: number; amount: number; source: string }[]
    >(`SELECT id, list_amount, amount, source::text AS source FROM ${S}.commissions ORDER BY id`);
    expect(rows).toEqual([
      { id: 'c1', list_amount: 600000, amount: 120000, source: 'membership' },
      { id: 'c2', list_amount: 1200000, amount: 276000, source: 'membership' },
    ]);
  });

  it('chính sách giữ % mặc định, thêm % Gọi vốn 10, CHECK 1–50', async () => {
    const [p] = await db.$queryRawUnsafe<{ default_rate: number; fundraising_rate: number }[]>(
      `SELECT default_rate, fundraising_rate FROM ${S}.affiliate_policy WHERE id = 1`,
    );
    expect(p).toEqual({ default_rate: 25, fundraising_rate: 10 });
    await expect(
      db.$executeRawUnsafe(`UPDATE ${S}.affiliate_policy SET fundraising_rate = 51 WHERE id = 1`),
    ).rejects.toThrow(/affiliate_policy_fundraising_rate_check/);
  });
});
