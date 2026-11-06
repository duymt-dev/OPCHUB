import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type DbClient } from '@opchub/db';
import { loadEnv } from '@/common/config';
import { SecretBox } from '@/common/crypto/secret-box';
import { aiSettingsSchema } from '@opchub/shared/api-domains';
import { LocalLlmProvider } from '@opchub/integrations';
import { llmHttpStub } from '../helpers/llm-http-stub';
const dir = resolve('../../packages/db/prisma/migrations/20261113090000_v46_ai_providers');
const statements = (name: string) =>
  readFileSync(resolve(dir, name), 'utf8')
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
describe('REQ-628 migrate llm_configs on isolated connection-local copy', () => {
  let db: DbClient;
  let stub: Awaited<ReturnType<typeof llmHttpStub>>;
  beforeAll(async () => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    stub = await llmHttpStub();
  });
  afterAll(async () => {
    await db.$disconnect();
    await stub.close();
  });
  it('migrate llm_configs: encrypted bytes/settings preserved, exact rollback retains legacy singleton', async () => {
    const box = new SecretBox(loadEnv());
    const encrypted = Uint8Array.from(box.seal('TIP811-migration-key'));
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`CREATE TEMP TABLE llm_configs (LIKE public.llm_configs INCLUDING ALL) ON COMMIT DROP`;
      await tx.$executeRaw`CREATE TEMP TABLE app_settings (LIKE public.app_settings INCLUDING ALL) ON COMMIT DROP`;
      await tx.$executeRaw`INSERT INTO pg_temp.llm_configs (id,base_url,model,key_enc,max_tokens,timeout_ms,enabled,updated_at) VALUES(1,${stub.url},'legacy-model',${encrypted},128,1000,true,now())`;
      // Only TEMP storage qualification changes; every migration data/check/index statement is exact.
      for (const sql of statements('migration.sql'))
        await tx.$executeRawUnsafe(sql.replace('CREATE TABLE ', 'CREATE TEMP TABLE '));
      const rows = await tx.$queryRaw<
        { key_enc: Uint8Array; enabled: boolean; model: string; base_url: string }[]
      >`SELECT key_enc,enabled,model,base_url FROM pg_temp.llm_providers WHERE id='custom'`;
      expect(rows[0]?.enabled).toBe(true);
      expect(rows[0]?.model).toBe('legacy-model');
      expect(box.open(rows[0]?.key_enc ?? new Uint8Array()).toString()).toBe(
        'TIP811-migration-key',
      );
      const config = await tx.$queryRaw<
        { value: unknown }[]
      >`SELECT value FROM pg_temp.app_settings WHERE key='ai'`;
      expect(aiSettingsSchema.parse(config[0]?.value)).toMatchObject({
        use: { bot: 'custom', script: 'custom' },
        maxTokens: 128,
        timeoutMs: 1000,
      });
      const migrated = rows[0];
      if (!migrated) throw new Error('Missing migrated custom provider');
      const settings = aiSettingsSchema.parse(config[0]?.value);
      const adapter = new LocalLlmProvider({
        baseUrl: migrated.base_url,
        model: migrated.model,
        apiKey: box.open(migrated.key_enc).toString(),
        maxTokens: settings.maxTokens,
        timeoutMs: settings.timeoutMs,
        maxRequests: 1,
      });
      await expect(adapter.complete('legacy bot turn')).resolves.toBe('OK from local stub');
      expect(stub.requests.at(-1)?.authorization).toBe('Bearer TIP811-migration-key');
      expect(stub.requests.at(-1)?.body).toContain('"model":"legacy-model"');
      for (const sql of statements('down.sql')) await tx.$executeRawUnsafe(sql);
      expect(
        (await tx.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_temp.llm_configs`)[0]
          ?.count,
      ).toBe(1n);
      expect(
        (await tx.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_temp.app_settings`)[0]
          ?.count,
      ).toBe(0n);
    });
  });
});
