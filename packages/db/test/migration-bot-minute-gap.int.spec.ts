import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type DbTx } from '../src/client';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const sql = readFileSync(
  join(__dirname, '../prisma/migrations/20261028173908_v42_bot_minute_gap/migration.sql'),
  'utf8',
);
const statements = sql
  .replace(/^--.*$/gm, '')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);
const now = new Date('2026-10-29T05:00:00Z');
afterAll(() => db.$disconnect());

async function migrated<T>(verify: (tx: DbTx) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL search_path TO pg_temp`;
    await tx.$executeRaw`CREATE TEMP TABLE bot_scripts (id text PRIMARY KEY, delay_minutes integer NOT NULL) ON COMMIT DROP`;
    await tx.$executeRaw`CREATE TEMP TABLE app_settings (key text PRIMARY KEY, value jsonb NOT NULL) ON COMMIT DROP`;
    await tx.$executeRaw`CREATE TEMP TABLE bot_threads (
      id text PRIMARY KEY, script_id text, kind text, status text, cursor integer,
      next_at timestamptz, updated_at timestamptz NOT NULL
    ) ON COMMIT DROP`;
    await tx.$executeRaw`INSERT INTO bot_scripts VALUES ('low',1),('six',6),('max',60),('legacy',120)`;
    await tx.$executeRaw`INSERT INTO app_settings VALUES ('bot','{"delayMinutes":120,"enabled":true}'),('other','{}')`;
    await tx.$executeRaw`INSERT INTO bot_threads (id,script_id,kind,status,cursor,next_at,updated_at) VALUES
      ('six','six','script','running',1,${now}::timestamptz + interval '5 minutes',${now}),
      ('legacy','legacy','script','running',1,${now}::timestamptz + interval '5 minutes',${now}),
      ('auto',NULL,'auto','running',1,${now}::timestamptz + interval '5 minutes',${now}),
      ('reply',NULL,'reply','running',1,${now}::timestamptz + interval '5 seconds',${now}),
      ('first','legacy','script','scheduled',0,${now},${now}),
      ('done','legacy','script','done',2,NULL,${now}),
      ('later','six','script','running',1,${now}::timestamptz + interval '2 hours',${now}),
      ('low','low','script','running',1,${now}::timestamptz + interval '5 minutes',${now})`;
    // Trusted, checked-in migration statements, not data-driven per-row queries.
    for (const statement of statements) await tx.$executeRawUnsafe(statement);
    return verify(tx);
  });
}

describe('D-112 minute-gap migration on actual PostgreSQL legacy tables', () => {
  it('normalizes only out-of-range values, preserves enabled/other settings, and extends pending non-reply deadlines', async () => {
    await migrated(async (tx) => {
      expect(await tx.$queryRaw`SELECT id, delay_minutes FROM bot_scripts ORDER BY id`).toEqual([
        { id: 'legacy', delay_minutes: 60 },
        { id: 'low', delay_minutes: 1 },
        { id: 'max', delay_minutes: 60 },
        { id: 'six', delay_minutes: 6 },
      ]);
      expect(await tx.$queryRaw`SELECT key, value FROM app_settings ORDER BY key`).toEqual([
        { key: 'bot', value: { delayMinutes: 60, enabled: true } },
        { key: 'other', value: {} },
      ]);
      const rows = await tx.$queryRaw<
        { id: string; next_at: Date | null }[]
      >`SELECT id, next_at FROM bot_threads`;
      const deadlines = Object.fromEntries(
        rows.map((row) => [row.id, row.next_at ? row.next_at.getTime() - now.getTime() : null]),
      );
      expect(deadlines).toEqual({
        six: 360000,
        legacy: 3600000,
        auto: 3600000,
        reply: 5000,
        first: 0,
        done: null,
        later: 7200000,
        low: 300000,
      });
      for (const statement of statements.filter((s) => s.startsWith('UPDATE')))
        await tx.$executeRawUnsafe(statement);
      expect(await tx.$queryRaw`SELECT id, next_at FROM bot_threads ORDER BY id`).toEqual(
        [...rows].sort((a, b) => a.id.localeCompare(b.id)),
      );
    });
  });

  it.each([0, -1, 61, 120])(
    'DB rejects script spacing %s even when bypassing HTTP',
    async (minutes) => {
      await expect(
        migrated(
          (tx) =>
            tx.$executeRaw`UPDATE bot_scripts SET delay_minutes = ${minutes} WHERE id = 'six'`,
        ),
      ).rejects.toMatchObject({
        code: 'P2010',
        meta: { driverAdapterError: { cause: { code: '23514' } } },
      });
    },
  );
  it.each([0, -1, 1.5, 61, 120, '5', null])(
    'DB rejects invalid global spacing %j without touching other settings',
    async (minutes) => {
      await expect(
        migrated(
          (tx) =>
            tx.$executeRaw`UPDATE app_settings SET value = ${JSON.stringify({ delayMinutes: minutes })}::jsonb WHERE key = 'bot'`,
        ),
      ).rejects.toMatchObject({
        code: 'P2010',
        meta: { driverAdapterError: { cause: { code: '23514' } } },
      });
    },
  );
});
