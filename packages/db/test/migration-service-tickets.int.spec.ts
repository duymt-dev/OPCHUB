import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V4-605 (D-72): chạy migration `v4_service_tickets` trên schema tạm có cấu trúc trước V4 —
 * phiếu + ghi chú giữ nguyên, bỏ trạng thái, người phụ trách, index trạng thái, enum.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const S = 'mig_v4_605';
const SQL = readFileSync(
  join(__dirname, '../prisma/migrations/20261023180000_v4_service_tickets/migration.sql'),
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
  `CREATE TYPE ${S}.service_request_status AS ENUM ('new', 'consulting', 'quoted', 'won', 'lost')`,
  `CREATE TABLE ${S}.service_requests (code text PRIMARY KEY, full_name text NOT NULL,
     note text NOT NULL DEFAULT '', status ${S}.service_request_status NOT NULL DEFAULT 'new',
     assignee text, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX service_requests_status_created_at_idx ON ${S}.service_requests (status, created_at DESC)`,
  `CREATE TABLE ${S}.service_request_comments (id text PRIMARY KEY, request_code text NOT NULL
     REFERENCES ${S}.service_requests(code), body text NOT NULL, mentions text[] NOT NULL DEFAULT '{}')`,
  `INSERT INTO ${S}.service_requests (code, full_name, note, status, assignee) VALUES
     ('YC-1001', 'Nguyễn An', 'Cần tư vấn', 'won', 'Lê Minh Châu'),
     ('YC-1002', 'Trần Bình', '', 'lost', NULL),
     ('YC-1003', 'Lê Chi', 'Báo giá', 'new', 'Phạm Thu Hà')`,
  `INSERT INTO ${S}.service_request_comments VALUES ('c1', 'YC-1001', '<p>Đã gọi</p>', '{"Phạm Thu Hà"}')`,
];

describe('migration D-72 phiếu yêu cầu dịch vụ (TIP-V4-605)', () => {
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

  it('giữ nguyên phiếu và ghi chú (kể cả gắn tên)', async () => {
    const r = await db.$queryRawUnsafe<{ code: string; full_name: string; note: string }[]>(
      `SELECT code, full_name, note FROM ${S}.service_requests ORDER BY code`,
    );
    expect(r).toEqual([
      { code: 'YC-1001', full_name: 'Nguyễn An', note: 'Cần tư vấn' },
      { code: 'YC-1002', full_name: 'Trần Bình', note: '' },
      { code: 'YC-1003', full_name: 'Lê Chi', note: 'Báo giá' },
    ]);
    const c = await db.$queryRawUnsafe<{ id: string; mentions: string[] }[]>(
      `SELECT id, mentions FROM ${S}.service_request_comments`,
    );
    expect(c).toEqual([{ id: 'c1', mentions: ['Phạm Thu Hà'] }]);
  });

  it('bỏ cột trạng thái + phụ trách, index trạng thái, enum', async () => {
    const cols = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM information_schema.columns
       WHERE table_schema = '${S}' AND table_name = 'service_requests'
         AND column_name IN ('status', 'assignee')`,
    );
    expect(cols[0]?.n).toBe(0);
    const rel = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = '${S}' AND c.relname = 'service_requests_status_created_at_idx'`,
    );
    expect(rel[0]?.n).toBe(0);
    const ty = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = '${S}' AND t.typname = 'service_request_status'`,
    );
    expect(ty[0]?.n).toBe(0);
  });
});
