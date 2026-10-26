import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V4-607 (REQ-504): migration `v4_declaration` trên schema tạm trước V4 — user cũ coi như đã
 * khai báo (declared_at = created_at), `opc_intent` lấy từ nhóm đang tham gia theo thứ tự vào nhóm.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const S = 'mig_v4_607';
const SQL = readFileSync(
  join(__dirname, '../prisma/migrations/20261024090000_v4_declaration/migration.sql'),
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
  `CREATE TABLE ${S}.users (id text PRIMARY KEY, created_at timestamptz(6) NOT NULL)`,
  `CREATE TABLE ${S}.business_profiles (user_id text PRIMARY KEY, tax_code text NOT NULL)`,
  `CREATE TABLE ${S}.group_members (group_id text NOT NULL, user_id text NOT NULL,
     status text NOT NULL, created_at timestamptz(6) NOT NULL, PRIMARY KEY (group_id, user_id))`,
  `INSERT INTO ${S}.users VALUES ('u1', '2026-01-02T03:00:00Z'), ('u2', '2026-05-06T07:00:00Z')`,
  `INSERT INTO ${S}.business_profiles VALUES ('u2', '0101234567')`,
  `INSERT INTO ${S}.group_members VALUES
     ('c5', 'u1', 'member', '2026-02-01T00:00:00Z'),
     ('c1', 'u1', 'member', '2026-03-01T00:00:00Z'),
     ('c9', 'u1', 'left', '2026-01-15T00:00:00Z')`,
];

describe('migration khai báo sau đăng nhập (TIP-V4-607)', () => {
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

  it('user cũ: declared_at = created_at; opc_intent theo nhóm đang tham gia (bỏ nhóm đã rời)', async () => {
    const rows = await db.$queryRawUnsafe<{ id: string; same: boolean; opc_intent: string[] }[]>(
      `SELECT id, declared_at = created_at AS same, opc_intent FROM ${S}.users ORDER BY id`,
    );
    expect(rows).toEqual([
      { id: 'u1', same: true, opc_intent: ['c5', 'c1'] },
      { id: 'u2', same: true, opc_intent: [] },
    ]);
  });

  it('TK mới sau migration: declared_at NULL, opc_intent rỗng; hồ sơ DN có cột province', async () => {
    await db.$executeRawUnsafe(`INSERT INTO ${S}.users (id, created_at) VALUES ('u3', now())`);
    const [u] = await db.$queryRawUnsafe<{ declared_at: Date | null; opc_intent: string[] }[]>(
      `SELECT declared_at, opc_intent FROM ${S}.users WHERE id = 'u3'`,
    );
    expect(u).toEqual({ declared_at: null, opc_intent: [] });
    const [b] = await db.$queryRawUnsafe<{ province: string | null }[]>(
      `SELECT province FROM ${S}.business_profiles WHERE user_id = 'u2'`,
    );
    expect(b).toEqual({ province: null });
  });
});
