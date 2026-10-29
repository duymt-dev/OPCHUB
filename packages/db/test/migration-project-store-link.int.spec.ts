import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V42-711 (QT-ST-PJ): migration `v42_project_store_link` trên schema tạm —
 * `projects.store_id` (nullable, FK → stores, SET NULL khi xoá gian hàng) + `projects.province`
 * (mặc định ''); dự án cũ (store_id NULL) không đổi.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const S = 'mig_v42_711';
const SQL = readFileSync(
  join(__dirname, '../prisma/migrations/20261028075914_v42_project_store_link/migration.sql'),
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
  `CREATE TABLE ${S}.stores (id text PRIMARY KEY, owner_id text NOT NULL UNIQUE, name text NOT NULL)`,
  `CREATE TABLE ${S}.projects (id text PRIMARY KEY, owner_id text NOT NULL, name text NOT NULL DEFAULT '')`,
  `INSERT INTO ${S}.stores (id, owner_id, name) VALUES ('s1', 'u1', 'Gian hàng 1')`,
  `INSERT INTO ${S}.projects (id, owner_id, name) VALUES
     ('p-old', 'u2', 'Dự án cũ không qua gian hàng'),
     ('p-store', 'u1', 'Dự án đăng từ gian hàng')`,
];

const run = () =>
  db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO ${S}`);
    for (const s of statements(SQL)) {
      // Statement cuối (CREATE INDEX) không cần đổi tên bảng — projects/stores đã ở schema đúng nhờ search_path
      await tx.$executeRawUnsafe(s);
    }
  });

describe('migration gắn dự án với gian hàng D-109/QT-ST-PJ (TIP-V42-711)', () => {
  beforeAll(async () => {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${S} CASCADE`);
    for (const s of BEFORE) await db.$executeRawUnsafe(s);
    await run();
    await db.$executeRawUnsafe(`UPDATE ${S}.projects SET store_id = 's1' WHERE id = 'p-store'`);
  });
  afterAll(async () => {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${S} CASCADE`);
    await db.$disconnect();
  });

  const projects = () =>
    db.$queryRawUnsafe<{ id: string; store_id: string | null; province: string }[]>(
      `SELECT id, store_id, province FROM ${S}.projects ORDER BY id`,
    );

  it('cột mới: store_id NULL mặc định, province mặc định rỗng', async () => {
    const rows = await projects();
    expect(rows).toEqual([
      { id: 'p-old', store_id: null, province: '' },
      { id: 'p-store', store_id: 's1', province: '' },
    ]);
  });

  it('xoá gian hàng → store_id của dự án về NULL (ON DELETE SET NULL), dự án giữ nguyên', async () => {
    await db.$executeRawUnsafe(`DELETE FROM ${S}.stores WHERE id = 's1'`);
    const rows = await projects();
    expect(rows).toEqual([
      { id: 'p-old', store_id: null, province: '' },
      { id: 'p-store', store_id: null, province: '' },
    ]);
  });
});
