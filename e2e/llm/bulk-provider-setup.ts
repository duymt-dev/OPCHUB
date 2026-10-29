import { adminLoginResponseSchema } from '@opchub/shared/api';
import type { APIRequestContext } from '@playwright/test';
import {
  botScheduleResponseSchema,
  llmConfigSchema,
  llmConfigUpdateSchema,
} from '@opchub/shared/api-domains';
import { env } from '../env';

/** Native prerequisite only: real login/configuration endpoints, no intercepted browser API. */
export async function configureBulkProvider(request: APIRequestContext, baseUrl: string) {
  const api = `${env.API_PROXY_URL}/v1`;
  const login = await request.post(`${api}/admin/auth/login`, {
    data: { identifier: 'admin@opchub.community', password: 'Admin@2026' },
  });
  if (login.status() !== 200) throw new Error(`Native fixture login returned ${login.status()}`);
  const { accessToken } = adminLoginResponseSchema.parse(await login.json());
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` };
  const scheduleResponse = await request.get(`${api}/admin/bot/schedule`, { headers });
  if (!scheduleResponse.ok()) throw new Error('Native fixture cannot read schedule');
  const { schedule } = botScheduleResponseSchema.parse(await scheduleResponse.json());
  const pause = async (paused: boolean) => {
    const response = await request.patch(`${api}/admin/bot/schedule`, {
      headers,
      data: { paused },
    });
    if (!response.ok()) throw new Error('Native fixture cannot update schedule');
    const saved = botScheduleResponseSchema.parse(await response.json());
    if (saved.schedule.paused !== paused) throw new Error('Native pause did not persist');
  };
  const save = async (enabled: boolean) => {
    const response = await request.put(`${api}/admin/settings/llm`, {
      headers,
      data: llmConfigUpdateSchema.parse({
        baseUrl,
        enabled,
        model: 'browser-bulk-model',
        key: 'browser-bulk-test-key',
        maxTokens: 1024,
        timeoutMs: 2000,
      }),
    });
    if (response.status() !== 200)
      throw new Error(`Native fixture save returned ${response.status()}`);
    const config = llmConfigSchema.parse(await response.json());
    if (config.enabled !== enabled || config.configured !== enabled)
      throw new Error('Native fixture configuration did not persist');
  };
  await pause(true);
  try {
    await save(true);
  } catch (error) {
    await pause(schedule.paused);
    throw error;
  }
  return {
    async disable() {
      await save(false);
      await pause(schedule.paused);
    },
  };
}
