import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const migration = readFileSync(
  join(__dirname, '../prisma/migrations/20261028144206_v42_llm_config/migration.sql'),
  'utf8',
)
  .replace('CREATE TABLE', 'CREATE TEMP TABLE')
  .replace('\n);', '\n) ON COMMIT DROP;');
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
