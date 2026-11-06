import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { z } from 'zod';
import { adminLoginResponseSchema } from '@opchub/shared/api';
import { aiSettingsResponseSchema, aiSettingsUpdateSchema } from '@opchub/shared/api-domains';
import type { Page } from '../server/test';
import { env } from '../env';
import { aiBrowserFixture } from './settings-session';

const requestSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })).max(8),
});
const contextSchema = z.object({ topic: z.string().max(1000) });
async function replyStub() {
  const server = createServer((req, res) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw.length > 64000) throw new Error('Oversized fixture request');
      const body = requestSchema.parse(JSON.parse(raw));
      const context = contextSchema.parse(
        JSON.parse(body.messages.find((m) => m.role === 'user')?.content ?? 'null'),
      );
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          choices: [
            {
              message: { content: `Mình chia sẻ thêm về chủ đề: ${context.topic}` },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 20 },
        }),
      );
    })().catch(() => {
      res.writeHead(400);
      res.end('{}');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}/v1`,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
    },
  };
}
/** D-63 native-only prerequisite AFTER demoReset; UI/body/quote/privacy assertions stay identical. */
export async function nativeReplyProvider(page: Page) {
  if (env.E2E_TARGET !== 'server') return { close: () => Promise.resolve() };
  const stub = await replyStub();
  try {
    const api = `${env.API_PROXY_URL}/v1`;
    const login = await page.request.post(`${api}/admin/auth/login`, {
      data: { identifier: 'admin@opchub.community', password: 'Admin@2026' },
    });
    if (login.status() !== 200) throw new Error(`Reply fixture login${login.status()}`);
    const { accessToken } = adminLoginResponseSchema.parse(await login.json());
    const draft = aiBrowserFixture(stub.url);
    const config = aiSettingsUpdateSchema.parse({
      ...draft,
      providers: draft.providers.map((p) =>
        p.id === 'custom' ? { ...p, model: 'native-reply-stub' } : p,
      ),
    });
    const save = await page.request.put(`${api}/admin/settings/ai`, {
      headers: { authorization: `Bearer ${accessToken}` },
      data: config,
    });
    if (save.status() !== 200) throw new Error(`Reply fixture config${save.status()}`);
    aiSettingsResponseSchema.parse(await save.json());
    return stub;
  } catch (error) {
    await stub.close();
    throw error;
  }
}
