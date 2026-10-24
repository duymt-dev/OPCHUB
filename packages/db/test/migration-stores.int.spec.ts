import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V4-608 (REQ-510, D-75, D-84): chạy migration `v4_local_stores` trên schema tạm — không tạo
 * gian hàng hàng loạt cho DN cũ; mỗi TK một gian hàng; ẩn phải nhớ trạng thái trước; giá ≥ 0.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const S = 'mig_v4_608';
const SQL = readFileSync(
  join(__dirname, '../prisma/migrations/20261024200000_v4_local_stores/migration.sql'),
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
  `CREATE TABLE ${S}.users (id text PRIMARY KEY, account_type text NOT NULL)`,
  `INSERT INTO ${S}.users VALUES ('u1', 'business'), ('u2', 'business'), ('u3', 'personal')`,
];

const insStore = (id: string, owner: string, status = 'draft', prev: string | null = null) =>
  db.$executeRawUnsafe(
    `INSERT INTO ${S}.stores (id, owner_id, name, status, hidden_prev, updated_at)
     VALUES ('${id}', '${owner}', 'G', '${status}', ${prev ? `'${prev}'` : 'NULL'}, now())`,
  );

describe('migration Gian hàng (TIP-V4-608)', () => {
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
    await db.$disconnect();
  });

  it('D-84: không tạo gian hàng cho DN có sẵn', async () => {
    const [{ n }] = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM ${S}.stores`,
    );
    expect(n).toBe(0);
  });

  it('mỗi TK một gian hàng; ẩn phải nhớ trạng thái trước (không phải hidden)', async () => {
    await insStore('s1', 'u1');
    await expect(insStore('s2', 'u1')).rejects.toThrow(/stores_owner_id_key/);
    await expect(insStore('s3', 'u2', 'hidden')).rejects.toThrow(/stores_hidden_prev_check/);
    await expect(insStore('s4', 'u2', 'hidden', 'hidden')).rejects.toThrow(
      /stores_hidden_prev_check/,
    );
    await expect(insStore('s5', 'u2', 'published', 'draft')).rejects.toThrow(
      /stores_hidden_prev_check/,
    );
    await insStore('s6', 'u2', 'hidden', 'published');
  });

  it('giá NULL = báo giá riêng; giá âm bị chặn; xoá gian hàng xoá item', async () => {
    const item = (id: string, price: string) =>
      db.$executeRawUnsafe(
        `INSERT INTO ${S}.store_items (id, store_id, kind, name, price)
         VALUES ('${id}', 's1', 'product', 'SP', ${price})`,
      );
    await item('i1', 'NULL');
    await item('i2', '450000');
    await expect(item('i3', '-1')).rejects.toThrow(/store_items_price_check/);
    await db.$executeRawUnsafe(`DELETE FROM ${S}.stores WHERE id = 's1'`);
    const [{ n }] = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM ${S}.store_items`,
    );
    expect(n).toBe(0);
  });
});
