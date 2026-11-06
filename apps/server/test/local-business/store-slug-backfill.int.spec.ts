import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type DbClient } from '@opchub/db';
import { availableStoreSlug, storeSlugBase } from '@opchub/shared';
import { loadEnv } from '@/common/config';

const directory = resolve(
  process.cwd(),
  '../../packages/db/prisma/migrations/20261112090000_v46_store_public_page',
);
const statements = (name: string) =>
  readFileSync(resolve(directory, name), 'utf8')
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

describe('REQ-627 BR-494 exact migration backfill', () => {
  let db: DbClient;
  beforeAll(() => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
  });
  afterAll(() => db?.$disconnect());
  it('slug: deterministic created_at/id order, duplicate and natural-suffix collisions, JS parity', async () => {
    const names = [
      'Cà phê Ngon',
      'Cà phê Ngon',
      'Cà phê Ngon 2',
      'Đặc sản Đà Lạt!!',
      '!!!',
      'a'.repeat(59) + ' ' + 'b'.repeat(40),
    ];
    const rows = await db.$transaction(async (tx) => {
      await tx.$executeRaw`CREATE TEMP TABLE stores (id text PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL) ON COMMIT DROP`;
      // Static fixture SQL; migration itself must perform one set-based backfill, not JS writes.
      await tx.$executeRaw`INSERT INTO pg_temp.stores(id,name,created_at)
        SELECT n::text, name, '2026-01-01T00:00:00Z'::timestamptz FROM unnest(${names}::text[]) WITH ORDINALITY AS names(name,n)`;
      for (const sql of statements('migration.sql')) await tx.$executeRawUnsafe(sql);
      return tx.$queryRaw<
        { id: string; slug: string; seo_index: boolean; seo_title: string; seo_desc: string }[]
      >`SELECT id,slug,seo_index,seo_title,seo_desc FROM pg_temp.stores ORDER BY id`;
    });
    const taken: string[] = [];
    expect(rows.map((r) => r.slug)).toEqual(
      names.map((name) => {
        const slug = availableStoreSlug(storeSlugBase(name), taken);
        taken.push(slug);
        return slug;
      }),
    );
    expect(rows.every((r) => r.seo_index && !r.seo_title && !r.seo_desc)).toBe(true);
  });
  it('migration CHECKs reject invalid persisted SEO/slug; down removes only the four new columns', async () => {
    for (const [column, value] of [
      ['seo_title', 'x'.repeat(71)],
      ['seo_desc', 'x'.repeat(161)],
      ['slug', 'Bad slug'],
    ] as const) {
      await expect(
        db.$transaction(async (tx) => {
          await tx.$executeRaw`CREATE TEMP TABLE stores (id text PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL) ON COMMIT DROP`;
          for (const sql of statements('migration.sql')) await tx.$executeRawUnsafe(sql);
          // column is a static allowlist above; value is bound, never concatenated.
          const { Prisma } = await import('@opchub/db');
          await tx.$executeRaw(
            Prisma.sql`INSERT INTO pg_temp.stores(id,name,created_at,${Prisma.raw(column)}) VALUES('x','X',now(),${value})`,
          );
        }),
      ).rejects.toThrow(/stores_(seo_title_length|seo_desc_length|slug_format)/);
    }
    const columns = await db.$transaction(async (tx) => {
      await tx.$executeRaw`CREATE TEMP TABLE stores (id text PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL) ON COMMIT DROP`;
      for (const sql of statements('migration.sql')) await tx.$executeRawUnsafe(sql);
      for (const sql of statements('down.sql')) await tx.$executeRawUnsafe(sql);
      return tx.$queryRaw<
        { attname: string }[]
      >`SELECT attname FROM pg_attribute WHERE attrelid='pg_temp.stores'::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum`;
    });
    expect(columns.map((c) => c.attname)).toEqual(['id', 'name', 'created_at']);
  });
});
