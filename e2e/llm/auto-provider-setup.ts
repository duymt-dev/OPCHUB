import { adminLoginResponseSchema } from '@opchub/shared/api';
import {
  botThreadListSchema,
  botThreadStoppedSchema,
  scriptListSchema,
  scriptUpsertSchema,
} from '@opchub/shared/api-domains';
import type { Page } from '../server/test';
import { env } from '../env';

/** Auto-topic cases must not compete with unrelated seeded script executions. */
export async function isolateNativeAutoTopics(page: Page) {
  if (env.E2E_TARGET !== 'server') return;
  const api = `${env.API_PROXY_URL}/v1/admin`;
  const login = await page.request.post(`${api}/auth/login`, {
    data: { identifier: 'admin@opchub.community', password: 'Admin@2026' },
  });
  if (login.status() !== 200) throw new Error(`Auto prerequisite login ${login.status()}`);
  const { accessToken } = adminLoginResponseSchema.parse(await login.json());
  const headers = { authorization: `Bearer ${accessToken}` };
  const scripts = await page.request.get(`${api}/scripts`, { headers });
  if (!scripts.ok()) throw new Error(`Auto prerequisite scripts ${scripts.status()}`);
  for (const script of scriptListSchema.parse(await scripts.json()).items) {
    const saved = await page.request.patch(`${api}/scripts/${script.id}`, {
      headers,
      data: scriptUpsertSchema.parse({ ...script, runAt: '2099-01-01T00:00:00.000Z' }),
    });
    if (!saved.ok()) throw new Error(`Auto prerequisite defer ${saved.status()}`);
  }
  const threads = await page.request.get(`${api}/bot/threads`, { headers });
  if (!threads.ok()) throw new Error(`Auto prerequisite threads ${threads.status()}`);
  for (const thread of botThreadListSchema.parse(await threads.json()).items) {
    if (thread.status === 'done') continue;
    const stopped = await page.request.post(`${api}/bot/threads/${thread.id}/stop`, { headers });
    if (!stopped.ok()) throw new Error(`Auto prerequisite stop ${stopped.status()}`);
    botThreadStoppedSchema.parse(await stopped.json());
  }
}
