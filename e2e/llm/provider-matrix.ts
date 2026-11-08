import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import {
  AI_PROVIDER_CATALOG,
  aiSettingsResponseSchema,
  aiSettingsUpdateSchema,
  aiVerifyResultSchema,
  botReplySettingsSchema,
  botReplyScanResultSchema,
  type AiProviderId,
  type AiSettingsResponse,
} from '@opchub/shared/api-domains';
import { expect, type Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { env, liveDatabaseUrl } from '../env';
import { settingsFixture, settingsLogin } from './settings-session';

/** Explicit whitelist: never copy response-only credential labels into a snapshot. */
export function configuration(value: AiSettingsResponse) {
  return aiSettingsUpdateSchema.parse({
    use: value.use,
    fallback: value.fallback,
    temperature: value.temperature,
    maxTokens: value.maxTokens,
    timeoutMs: value.timeoutMs,
    budget: value.budget,
    warnPct: value.warnPct,
    log: value.log,
    pii: value.pii,
    providers: value.providers.map(({ id, enabled, baseUrl, model, priceIn, priceOut }) => ({
      id,
      enabled,
      baseUrl,
      model,
      priceIn,
      priceOut,
    })),
  });
}

export async function readConfiguration(
  page: Page,
  observe?: (headers: Record<string, string>) => void,
) {
  const received = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/settings/ai' && r.request().method() === 'GET',
  );
  await page.goto(`${ADMIN_URL}/settings?tab=llm`);
  const response = await received;
  if (response.status() !== 200) throw new Error(`Read AI settings: ${response.status()}`);
  observe?.(response.request().headers());
  return aiSettingsResponseSchema.parse(await response.json());
}

export async function matrixSession(page: Page) {
  const token = await settingsLogin(page);
  let headers: Record<string, string> = {};
  const current = await readConfiguration(page, (value) => {
    headers = value;
  });
  const snapshot = configuration(current);
  let restoreReplies: (() => Promise<void>) | undefined;
  return {
    current,
    snapshot,
    async boundReplies() {
      restoreReplies = await boundReplySample(page, headers);
    },
    async stopBot() {
      const response = await page.request.patch(`${env.API_PROXY_URL}/v1/admin/bot/settings`, {
        headers,
        data: { enabled: false, autoGenerate: false, replyToMembers: false },
      });
      if (response.status() !== 200) throw new Error(`Stop live bot: ${response.status()}`);
    },
    async select(id: AiProviderId) {
      await settingsFixture(
        page,
        token,
        'ai',
        {
          ...snapshot,
          use: { ...snapshot.use, bot: id },
          fallback: '',
          maxTokens: Math.min(snapshot.maxTokens, 256),
        },
        'PUT',
      );
    },
    async restore() {
      // Owner-approved exception: API forbids disabling the last provider. Stop the bot instead.
      await this.stopBot();
      await restoreReplies?.();
      await settingsFixture(page, token, 'ai', snapshot, 'PUT');
      expect(configuration(await readConfiguration(page))).toEqual(snapshot);
    },
  };
}

/** Avoid draining old unanswered messages (and spending tokens) before the one live question. */
async function boundReplySample(page: Page, headers: Record<string, string>) {
  const api = `${env.API_PROXY_URL}/v1/admin/bot/replies`;
  const runResponse = await page.request.get(`${api}/run`, { headers });
  if (!runResponse.ok()) throw new Error('Cannot isolate the live reply run');
  const { run } = botReplyScanResultSchema.parse(await runResponse.json());
  if (run?.status === 'running') {
    const stopped = await page.request.post(`${api}/${run.id}/stop`, { headers });
    if (!stopped.ok()) throw new Error('Cannot stop the prior reply run');
  }
  const response = await page.request.get(`${api}/settings`, { headers });
  if (!response.ok()) throw new Error('Cannot read live reply sampling');
  const snapshot = botReplySettingsSchema.parse(await response.json());
  const save = async (sampleSize: number) => {
    const saved = await page.request.patch(`${api}/settings`, {
      headers,
      data: { sampleSize, autoEnabled: false },
    });
    if (!saved.ok()) throw new Error('Cannot save live reply sampling');
  };
  await save(1);
  return () => save(snapshot.sampleSize);
}

/** The UI submits the stored credential server-side; the test never supplies a key. */
export async function verifyStoredProvider(page: Page, id: AiProviderId) {
  await readConfiguration(page);
  await page.getByRole('button', { name: AI_PROVIDER_CATALOG[id].name, exact: false }).click();
  await expect(page.getByLabel('API key', { exact: true })).toHaveValue('');
  const started = Date.now();
  const received = page.waitForResponse(
    (r) => new URL(r.url()).pathname === `/v1/admin/settings/ai/providers/${id}/verify`,
    { timeout: 90000 },
  );
  await page.getByRole('button', { name: 'Kiểm tra kết nối', exact: true }).click();
  const response = await received;
  if (response.status() !== 200) throw new Error(`Verify HTTP ${response.status()}`);
  return { ...aiVerifyResultSchema.parse(await response.json()), latencyMs: Date.now() - started };
}

const callSchema = z.object({
  id: z.string(),
  provider: z.string(),
  model: z.string(),
  prompt_tokens: z.number().int(),
  completion_tokens: z.number().int(),
  latency_ms: z.number().int(),
  status: z.string(),
  error_code: z.string().nullable(),
});

/** One indexed time-range read, metadata only. No credentials in process arguments/errors. */
export function callMetadata(since: Date) {
  const url = liveDatabaseUrl();
  const sql = `SELECT coalesce(json_agg(r), '[]'::json) FROM (
    SELECT id, provider, model, prompt_tokens, completion_tokens, latency_ms, status, error_code
    FROM llm_calls WHERE created_at >= '${since.toISOString()}'::timestamptz
    ORDER BY created_at, id LIMIT 100
  ) r;`;
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
  if (result.status !== 0) throw new Error('Private AI metadata query failed');
  return z.array(callSchema).max(100).parse(JSON.parse(result.stdout));
}
