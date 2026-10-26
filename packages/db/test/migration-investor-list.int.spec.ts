import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V4-604 (D-72): chạy migration `v4_investor_list` trên schema tạm có cấu trúc trước V4 —
 * quan tâm / tổng hợp giữ nguyên dữ liệu, bỏ trạng thái + bảng trao đổi, sự kiện
 * `investor.admin_replied` chưa phát được đóng (không còn consumer).
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const S = 'mig_v4_604';
const SQL = readFileSync(
  join(__dirname, '../prisma/migrations/20261023160000_v4_investor_list/migration.sql'),
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
  `CREATE TYPE ${S}.investor_interest_status AS ENUM ('sent', 'in_discussion', 'connected')`,
  `CREATE TABLE ${S}.investor_interests (id text PRIMARY KEY, investor_key text NOT NULL,
     amount bigint NOT NULL, status ${S}.investor_interest_status NOT NULL DEFAULT 'sent',
     created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX investor_interests_status_created_at_idx ON ${S}.investor_interests (status, created_at)`,
  `CREATE TABLE ${S}.investor_summaries (investor_key text PRIMARY KEY, total_amount bigint NOT NULL,
     interest_count int NOT NULL, status ${S}.investor_interest_status NOT NULL DEFAULT 'sent')`,
  `CREATE TABLE ${S}.investor_comments (id text PRIMARY KEY, investor_key text NOT NULL, body text NOT NULL)`,
  `CREATE TABLE ${S}.outbox_events (id bigserial PRIMARY KEY, type text NOT NULL, payload jsonb NOT NULL,
     dispatched_at timestamptz, locked_until timestamptz, last_error text,
     created_at timestamptz NOT NULL DEFAULT now())`,
  `INSERT INTO ${S}.investor_interests (id, investor_key, amount, status) VALUES
     ('i1', 'u1', 500000000, 'connected'), ('i2', 'u1', 100000000, 'connected'),
     ('i3', 'u2', 200000000, 'sent')`,
  `INSERT INTO ${S}.investor_summaries VALUES ('u1', 600000000, 2, 'connected'), ('u2', 200000000, 1, 'sent')`,
  `INSERT INTO ${S}.investor_comments VALUES ('c1', 'u1', 'Chào anh')`,
  `INSERT INTO ${S}.outbox_events (type, payload, dispatched_at) VALUES
     ('investor.admin_replied', '{"k":1}', NULL),
     ('investor.admin_replied', '{"k":2}', now() - interval '1 day'),
     ('group.joined', '{"k":3}', NULL)`,
];

describe('migration D-72 nhà đầu tư chỉ còn danh sách (TIP-V4-604)', () => {
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

  it('giữ nguyên quan tâm + tổng hợp (tiền, số lần)', async () => {
    const i = await db.$queryRawUnsafe<{ id: string; amount: bigint }[]>(
      `SELECT id, amount FROM ${S}.investor_interests ORDER BY id`,
    );
    expect(i.map((r) => [r.id, Number(r.amount)])).toEqual([
      ['i1', 500000000],
      ['i2', 100000000],
      ['i3', 200000000],
    ]);
    const s = await db.$queryRawUnsafe<
      { investor_key: string; total_amount: bigint; interest_count: number }[]
    >(
      `SELECT investor_key, total_amount, interest_count FROM ${S}.investor_summaries ORDER BY investor_key`,
    );
    expect(s.map((r) => [r.investor_key, Number(r.total_amount), r.interest_count])).toEqual([
      ['u1', 600000000, 2],
      ['u2', 200000000, 1],
    ]);
  });

  it('bỏ cột trạng thái, index trạng thái, bảng trao đổi, enum', async () => {
    const cols = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM information_schema.columns
       WHERE table_schema = '${S}' AND column_name = 'status'`,
    );
    expect(cols[0]?.n).toBe(0);
    const rel = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = '${S}'
         AND c.relname IN ('investor_comments', 'investor_interests_status_created_at_idx')`,
    );
    expect(rel[0]?.n).toBe(0);
    const ty = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = '${S}' AND t.typname = 'investor_interest_status'`,
    );
    expect(ty[0]?.n).toBe(0);
  });

  it('investor.admin_replied chưa phát → đóng kèm lý do; sự kiện khác không đụng', async () => {
    const o = await db.$queryRawUnsafe<
      { type: string; done: boolean; last_error: string | null }[]
    >(
      `SELECT type, dispatched_at IS NOT NULL AS done, last_error FROM ${S}.outbox_events ORDER BY id`,
    );
    expect(o).toEqual([
      {
        type: 'investor.admin_replied',
        done: true,
        last_error: 'D-72: luồng trao đổi nhà đầu tư đã bỏ',
      },
      { type: 'investor.admin_replied', done: true, last_error: null },
      { type: 'group.joined', done: false, last_error: null },
    ]);
  });
});
