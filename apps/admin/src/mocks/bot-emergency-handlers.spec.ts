import { setupServer } from 'msw/node';
import { botEmergencyStoppedSchema, botMessagesHiddenSchema } from '@opchub/shared/api-domains';
import {
  advanceMockBot,
  auditLog,
  botState,
  listSettingsLog,
  mockDb,
  resetMockDb,
} from '@opchub/shared/mock-domains';
import type { Message } from '@opchub/shared/api-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1/admin/bot`;
const send = (path: string, body?: unknown, actor = 'admin') =>
  fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(actor ? { Authorization: `Bearer mock.${actor}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const message = (id: string, roomId: string, simulated = true): Message => ({
  id,
  roomId,
  body: `Original ${id}`,
  sender: { name: 'Member', avatarUrl: null },
  attachment: null,
  reactions: [],
  pinned: false,
  isSimulated: simulated,
  createdAt: new Date().toISOString(),
});
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

describe('REQ-141 MSW emergency/hide contracts', () => {
  it('stops all scheduled/running work without posting a due turn, preserves settings and audits the actor', async () => {
    const settings = structuredClone(mockDb().botSettings);
    const state = botState();
    state.threads[0]!.status = 'scheduled';
    state.threads[0]!.nextAt = Date.now();
    const active = state.threads.filter((t) => t.status !== 'done').length;
    const count = [...mockDb().messages.values()].reduce((n, rows) => n + rows.length, 0);
    const response = await send('emergency-stop');
    expect(response.status).toBe(200);
    expect(botEmergencyStoppedSchema.parse(await response.json())).toEqual({
      enabled: false,
      stopped: active,
    });
    expect(mockDb().botSettings).toEqual({ ...settings, enabled: false });
    expect(state.threads.every((t) => t.status === 'done' && t.nextAt === null)).toBe(true);
    mockDb().botSettings.enabled = true;
    advanceMockBot(Date.now() + 86400000);
    expect([...mockDb().messages.values()].reduce((n, rows) => n + rows.length, 0)).toBe(count);
    expect(botState().audit[0]).toMatchObject({ action: 'bot.emergency_stop', actorId: 'admin' });
    expect(auditLog()[0]).toMatchObject({ action: 'bot.emergency_stop', actorId: 'admin' });
    expect(listSettingsLog()[0]?.summary).toContain(`${active}`);
  });

  it('repeated stop returns zero, retains history, and records each explicit action', async () => {
    await send('emergency-stop');
    const ids = botState().threads.map((t) => t.id);
    const response = await send('emergency-stop');
    expect(botEmergencyStoppedSchema.parse(await response.json())).toEqual({
      enabled: false,
      stopped: 0,
    });
    expect(botState().threads.map((t) => t.id)).toEqual(ids);
    expect(botState().audit.filter((r) => r.action === 'bot.emergency_stop')).toHaveLength(2);
  });

  it.each(['emergency-stop', 'hide-messages'])(
    'enforces authentication and bots.action before touching state: %s',
    async (path) => {
      for (const [actor, status] of [
        ['', 401],
        ['m1', 401],
        ['adm-mai', 403],
      ] as const) {
        expect((await send(path, {}, actor)).status).toBe(status);
      }
      expect(mockDb().botSettings.enabled).toBe(true);
      expect(botState().audit).toHaveLength(0);
    },
  );

  it('scoped hide counts only newly hidden bot rows/rooms, preserving human and Admin content', async () => {
    const db = mockDb();
    db.messages.clear();
    const bot = message('bot', 'c1-general');
    const human = message('human', 'c1-general', false);
    const old = { ...message('old', 'c1-general'), hiddenAt: '2026-10-20T01:00:00Z' };
    db.messages.set('c1-general', [bot, human, old]);
    db.messages.set('c2-general', [message('other', 'c2-general')]);
    const response = await send('hide-messages', { groupIds: ['c1', 'c1'] });
    expect(response.status).toBe(200);
    expect(botMessagesHiddenSchema.parse(await response.json())).toEqual({ hidden: 1, rooms: 1 });
    expect(bot.hiddenAt).toBe(new Date().toISOString());
    expect(bot.body).toBe('Original bot');
    expect(human.hiddenAt).toBeUndefined();
    expect(old.hiddenAt).toBe('2026-10-20T01:00:00Z');
    expect(db.messages.get('c2-general')?.[0]?.hiddenAt).toBeUndefined();
    expect(auditLog()[0]).toMatchObject({ action: 'bot.hide_messages', actorId: 'admin' });
    const again = await send('hide-messages', { groupIds: ['c1'] });
    expect(botMessagesHiddenSchema.parse(await again.json())).toEqual({ hidden: 0, rooms: 0 });
    const global = await send('hide-messages', {});
    expect(botMessagesHiddenSchema.parse(await global.json())).toEqual({ hidden: 1, rooms: 1 });
    expect(human.hiddenAt).toBeUndefined();
  });

  it.each([
    null,
    [],
    { groupIds: [] },
    { groupIds: [''] },
    { groupIds: ['c1'], extra: true },
    { groupIds: Array.from({ length: 101 }, () => 'c1') },
  ])('rejects invalid hide input rather than interpreting it as global: %j', async (body) => {
    const response = await send('hide-messages', body);
    expect(response.status).toBe(400);
    const data = (await response.json()) as { error: { fields: unknown[] } };
    expect(data.error.fields.length).toBeGreaterThan(0);
    expect(botState().audit).toHaveLength(0);
  });

  it.each(['', '{bad json'])(
    'rejects absent/malformed JSON instead of globally hiding: %j',
    async (body) => {
      const response = await fetch(`${BASE}/hide-messages`, {
        method: 'POST',
        body,
        headers: { Authorization: 'Bearer mock.admin', 'Content-Type': 'application/json' },
      });
      expect(response.status).toBe(400);
      expect(botState().audit).toHaveLength(0);
    },
  );
});
