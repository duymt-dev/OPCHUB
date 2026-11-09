import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import {
  aiSettingsResponseSchema,
  aiSettingsUpdateSchema,
  AI_PURPOSES,
  type AiSettingsResponse,
} from '@opchub/shared/api-domains';
import { env, liveDatabaseUrl } from '../env';
import { expect, type Page } from '../server/test';
import { settingsFixture } from './settings-session';

function privateSql(sql: string) {
  const url = liveDatabaseUrl();
  const result = spawnSync('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], {
    input: sql,
    encoding: 'utf8',
    windowsHide: true,
    env: {
      PGHOST: url.hostname,
      PGPORT: url.port || '5432',
      PGDATABASE: url.pathname.slice(1),
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGCONNECT_TIMEOUT: '5',
    },
  });
  if (result.status !== 0) throw Error('Owned AI fixture SQL failed');
  return result.stdout.trim();
}
function editable(snapshot: AiSettingsResponse) {
  const draft = Object.fromEntries(Object.entries(snapshot).filter(([key]) => key !== 'spend'));
  return aiSettingsUpdateSchema.parse({
    ...draft,
    providers: snapshot.providers.map(({ id, enabled, baseUrl, model, priceIn, priceOut }) => ({
      id,
      enabled,
      baseUrl,
      model,
      priceIn,
      priceOut,
      key: '',
    })),
  });
}

/** Use an unused provider only. Never read/copy/replace the owner's real custom key. */
export async function aiOpsFixture(page: Page, token: string, baseUrl: string) {
  if (env.E2E_TARGET === 'server') {
    liveDatabaseUrl();
    if (!['localhost', '127.0.0.1'].includes(new URL(env.API_PROXY_URL).hostname))
      throw Error('AI fixture requires the owned loopback API');
  }
  const snapshot = aiSettingsResponseSchema.parse(
    await page.evaluate(async (token) => {
      const response = await fetch('/v1/admin/settings/ai', {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw Error('AI config snapshot failed');
      return (await response.json()) as unknown;
    }, token),
  );
  const available = snapshot.providers.find(
    (p) =>
      p.id !== 'custom' && !p.enabled && !p.hasKey && p.status === 'none' && p.checkedAt === null,
  );
  if (!available) throw Error('No unused keyless AI provider; refusing owner key changes');
  const draft = editable(snapshot);
  for (const purpose of AI_PURPOSES) {
    if (!draft.providers.some((p) => p.id === draft.use[purpose] && p.enabled))
      draft.use[purpose] = '';
  }
  const id = available.id;
  const model = 'ai-ops-817-stub';
  const next = {
    ...draft,
    budget: 0,
    log: true,
    fallback: '' as const,
    models: { ...draft.models, content: model },
    use: { ...draft.use, content: id },
    providers: draft.providers.map((p) =>
      p.id === id
        ? {
            ...p,
            enabled: true,
            baseUrl,
            model,
            key: 'stub-only-TIP817-0001',
            priceIn: 0,
            priceOut: 0,
          }
        : p,
    ),
  };
  await settingsFixture(page, token, 'ai', next, 'PUT');
  // Only a hash of the NEW TEST credential's ciphertext, never credentials themselves.
  const fingerprint =
    env.E2E_TARGET === 'server'
      ? z
          .string()
          .regex(/^[a-f0-9]{32}$/)
          .parse(
            privateSql(
              `SELECT md5(key_enc) FROM llm_providers WHERE id='${id}' AND model='${model}';`,
            ),
          )
      : null;
  return async () => {
    if (env.E2E_TARGET === 'msw' && !snapshot.providers.some((p) => p.enabled)) {
      await page.evaluate(() => {
        sessionStorage.removeItem('opchub-mock-ai-providers');
        sessionStorage.removeItem('opchub-mock-ai-calls');
      });
      await page.reload();
      return;
    }
    await settingsFixture(page, token, 'ai', editable(snapshot), 'PUT');
    if (fingerprint) {
      const cleared = privateSql(
        `WITH changed AS (UPDATE llm_providers SET key_enc=NULL WHERE id='${id}' AND enabled=false AND md5(key_enc)='${fingerprint}' RETURNING id) SELECT count(*) FROM changed;`,
      );
      expect(cleared).toBe('1');
    }
  };
}
