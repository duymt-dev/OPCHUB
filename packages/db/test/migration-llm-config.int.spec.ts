import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
// A2: a self-contained legacy fixture, independent of the removed public table.
const migration = `CREATE TEMP TABLE llm_configs (
  id integer PRIMARY KEY DEFAULT 1, base_url text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '', key_enc bytea, max_tokens integer NOT NULL DEFAULT 128,
  timeout_ms integer NOT NULL DEFAULT 60000, enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL,
  CONSTRAINT llm_configs_singleton CHECK (id = 1),
  CONSTRAINT llm_configs_token_bounds CHECK (max_tokens BETWEEN 16 AND 1024),
  CONSTRAINT llm_configs_timeout_bounds CHECK (timeout_ms BETWEEN 1000 AND 120000),
  CONSTRAINT llm_configs_enabled_complete CHECK (
    NOT enabled OR (length(base_url) > 0 AND length(model) > 0 AND key_enc IS NOT NULL)
  )
) ON COMMIT DROP;`;
const statements = migration
  .replace(/^\s*--.*$/gm, '')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

/** Only static reviewed migration/test SQL, executed on connection-local TEMP tables. */
async function insert(sql: string) {
  return db.$transaction(async (tx) => {
    for (const statement of statements) await tx.$executeRawUnsafe(statement);
    await tx.$executeRawUnsafe(sql);
    return tx.$queryRaw<{ enabled: boolean; key_enc: Uint8Array | null }[]>`
      SELECT enabled, key_enc FROM pg_temp.llm_configs WHERE id = 1`;
  });
}

afterAll(() => db.$disconnect());

describe('REQ-607 ADR-0008 llm_configs migration', () => {
  it('A2 drop migration up and down', async () => {
    const dir = join(__dirname, '../prisma/migrations/20261114090000_v46_drop_llm_configs');
    const up = readFileSync(join(dir, 'migration.sql'), 'utf8').trim();
    expect(up.replace(/^\uFEFF/, '')).toBe('DROP TABLE IF EXISTS llm_configs;');
    const down = readFileSync(join(dir, 'down.sql'), 'utf8')
      .replace(/^\s*--.*$/gm, '')
      .replace('CREATE TABLE', 'CREATE TEMP TABLE')
      .replace('\n);', '\n) ON COMMIT DROP;');
    await db.$transaction(async (tx) => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
      await tx.$executeRaw`INSERT INTO pg_temp.llm_configs (updated_at) VALUES (now())`;
      // Qualify only the connection-local copy: never drop public configuration in a test.
      await tx.$executeRawUnsafe(up.replace('llm_configs', 'pg_temp.llm_configs'));
      expect(
        (
          await tx.$queryRaw<{ name: string | null }[]>`
        SELECT to_regclass('pg_temp.llm_configs')::text AS name`
        )[0]?.name,
      ).toBeNull();
      for (const sql of down
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean))
        await tx.$executeRawUnsafe(sql);
      expect(
        (
          await tx.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) FROM pg_temp.llm_configs`
        )[0]?.count,
      ).toBe(0n);
      const checks = await tx.$queryRaw<{ name: string; definition: string }[]>`
        SELECT conname AS name, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint WHERE conrelid = 'pg_temp.llm_configs'::regclass AND contype = 'c'
        ORDER BY conname`;
      expect(checks.map((c) => c.name)).toEqual([
        'llm_configs_enabled_complete',
        'llm_configs_singleton',
        'llm_configs_timeout_bounds',
        'llm_configs_token_bounds',
      ]);
      expect(checks.every((c) => c.definition.startsWith('CHECK'))).toBe(true);
      await tx.$executeRaw`INSERT INTO pg_temp.llm_configs (updated_at) VALUES (now())`;
      expect(
        (
          await tx.$queryRaw<{ enabled: boolean }[]>`
        SELECT enabled FROM pg_temp.llm_configs`
        )[0]?.enabled,
      ).toBe(false);
    });
  });
  it('defaults to disabled and stores no fake or plaintext key', async () => {
    expect(await insert('INSERT INTO llm_configs (updated_at) VALUES (now())')).toEqual([
      { enabled: false, key_enc: null },
    ]);
  });
  it('enforces singleton primary-key configuration', async () => {
    await expect(
      insert('INSERT INTO llm_configs (id, updated_at) VALUES (2, now())'),
    ).rejects.toThrow('llm_configs_singleton');
  });
  it.each([
    ['max_tokens, updated_at) VALUES (0, now())', 'llm_configs_token_bounds'],
    ['timeout_ms, updated_at) VALUES (120001, now())', 'llm_configs_timeout_bounds'],
    ['enabled, updated_at) VALUES (true, now())', 'llm_configs_enabled_complete'],
  ])('rejects invalid persisted configuration %s', async (values, constraint) => {
    await expect(insert(`INSERT INTO llm_configs (${values}`)).rejects.toThrow(constraint);
  });
});
