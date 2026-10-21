import { setupServer } from 'msw/node';
import { z } from 'zod';
import { auditLog, botState, mockDb } from '@opchub/shared/mock-domains';
import { handlers } from './handlers';
import {
  BOT_WRITES,
  botContractFixture,
  botRequest,
  botSnapshot,
} from './tests/bot-contract.fixture';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  botContractFixture();
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

const BODY_ROUTES = [
  ['POST', '/admin/personas'],
  ['PATCH', '/admin/personas/ps1'],
  ['POST', '/admin/scripts'],
  ['PATCH', '/admin/scripts/sc1'],
  ['PATCH', '/admin/bot/settings'],
] as const;

describe('TIP-V2-514 REQ-208 bot negative HTTP contracts', () => {
  it.each(BOT_WRITES)(
    '%s %s applies the native JSON byte limit even to command/delete bodies',
    async (method, path) => {
      const before = botSnapshot();
      const response = await botRequest(path, method, { ignored: 'x'.repeat(768 * 1024) });
      expect(response.status).toBe(413);
      expect(botSnapshot()).toEqual(before);
    },
  );
  it.each(BODY_ROUTES)(
    '%s %s rejects malformed/null/oversized JSON without mutation or audit',
    async (method, path) => {
      const before = botSnapshot();
      for (const [body, status] of [
        ['{', 400],
        ['null', 400],
        ['"' + 'x'.repeat(768 * 1024) + '"', 413],
      ] as const) {
        const response = await fetch(`${location.origin}/v1${path}`, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock.admin' },
          body,
        });
        expect(response.status).toBe(status);
        expect(botSnapshot()).toEqual(before);
      }
    },
  );

  it.each([
    ['DELETE', '/admin/personas/missing'],
    ['DELETE', '/admin/scripts/missing'],
    ['POST', '/admin/scripts/missing/run'],
    ['POST', '/admin/bot/threads/missing/stop'],
  ] as const)('%s %s returns404 without audit', async (method, path) => {
    expect((await botRequest(path, method)).status).toBe(404);
    expect(auditLog()).toEqual([]);
    expect(botState().audit).toEqual([]);
  });

  it('valid update payload with missing target returns404, while invalid input returns400 fields', async () => {
    for (const [path, input] of [
      ['/admin/personas/missing', { name: 'Valid persona', title: '', province: '', tone: '' }],
      [
        '/admin/scripts/missing',
        { topic: 'Valid script', groupIds: ['c1'], lines: [{ personaId: 'ps1', body: 'Text' }] },
      ],
    ] as const)
      expect((await botRequest(path, 'PATCH', input)).status).toBe(404);
    const bad = await botRequest('/admin/personas', 'POST', { name: '' });
    expect(bad.status).toBe(400);
    const error = z
      .object({
        error: z.object({
          code: z.literal('VALIDATION_ERROR'),
          fields: z.array(z.object({ path: z.string(), message: z.string().min(1) })),
        }),
      })
      .parse(await bad.json());
    expect(error.error.fields.map((field) => field.path)).toContain('name');
    expect(auditLog()).toEqual([]);
    expect(botState().audit).toEqual([]);
  });

  it('disabled manual run and terminal stop return409 without audit', async () => {
    const script = mockDb().scripts[0];
    if (!script) throw new Error('Missing script');
    script.enabled = false;
    expect((await botRequest(`/admin/scripts/${script.id}/run`, 'POST')).status).toBe(409);
    expect((await botRequest('/admin/bot/threads/th1/stop', 'POST')).status).toBe(409);
    expect(auditLog()).toEqual([]);
    expect(botState().audit).toEqual([]);
  });

  it('invalid repeated log search query returns400 before touching the worker', async () => {
    const before = botSnapshot();
    expect((await botRequest('/admin/bot/log?q=one&q=two')).status).toBe(400);
    expect(botSnapshot()).toEqual(before);
  });

  it('invalid page/size use the native shared schema catch defaults, with an exact page response', async () => {
    const before = botSnapshot();
    const response = await botRequest('/admin/bot/log?page=0&size=bad');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: before.log.slice(0, 10),
      page: 1,
      size: 10,
      total: before.log.length,
    });
    expect(botSnapshot()).toEqual(before);
  });
});
