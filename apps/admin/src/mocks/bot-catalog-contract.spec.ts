import { setupServer } from 'msw/node';
import { personaSchema, scriptSchema, scriptUpsertSchema } from '@opchub/shared/api-domains';
import {
  auditLog,
  botState,
  listSettingsLog,
  mockDb,
  saveMockMatrix,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';
import { BOT_READS, botContractFixture, botRequest } from './tests/bot-contract.fixture';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  botContractFixture();
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

function expectAudit(action: string, id: string, actor = 'admin') {
  expect(auditLog().filter((row) => row.action === action && row.target === id)).toHaveLength(1);
  expect(auditLog()[0]).toMatchObject({ actorId: actor, action, target: id });
  expect(botState().audit[0]).toMatchObject({ actorId: actor, action, entityId: id });
  expect(listSettingsLog()[0]).toMatchObject({ tag: 'moderation', at: new Date().toISOString() });
}

describe('TIP-V2-514 REQ-208 bot successful-command audits and DTOs', () => {
  it('read-only can inspect every bot resource without generating an Admin command audit', async () => {
    for (const path of BOT_READS)
      expect((await botRequest(path, 'GET', undefined, 'adm-hang')).status).toBe(200);
    expect(botState().audit).toEqual([]);
    expect(auditLog()).toEqual([]);
  });

  it('NA-28 grants are evaluated on every request without role-name checks', async () => {
    expect((await botRequest('/admin/scripts', 'GET', undefined, 'adm-hang')).status).toBe(200);
    saveMockMatrix('admin', { 'role-editor': [] });
    expect((await botRequest('/admin/scripts', 'GET', undefined, 'adm-hang')).status).toBe(403);
    saveMockMatrix('admin', { 'role-editor': ['bots.action'] });
    const run = await botRequest('/admin/scripts/sc1/run', 'POST', undefined, 'adm-hang');
    expect(run.status).toBe(202);
    expectAudit('script.run', 'sc1', 'adm-hang');
    expect((await botRequest('/admin/scripts', 'GET', undefined, 'adm-hang')).status).toBe(403);
  });

  it('persona create/update/delete uses the persisted identity, preserves postCount and audits once each', async () => {
    const input = { name: 'Created persona', title: '', province: '', tone: '', groupIds: ['c1'] };
    const response = await botRequest('/admin/personas', 'POST', input);
    expect(response.status).toBe(201);
    const created = personaSchema.parse(await response.json());
    expect(created).toMatchObject({ ...input, postCount: 0 });
    expectAudit('persona.create', created.id);
    const stored = mockDb().personas.find((row) => row.id === created.id);
    if (!stored) throw new Error('Missing persisted persona');
    stored.postCount = 12;
    const updated = await botRequest(`/admin/personas/${created.id}`, 'PATCH', {
      ...input,
      name: 'Renamed persona',
    });
    expect(updated.status).toBe(200);
    expect(personaSchema.parse(await updated.json())).toMatchObject({
      name: 'Renamed persona',
      postCount: 12,
    });
    expectAudit('persona.update', created.id);
    expect((await botRequest(`/admin/personas/${created.id}`, 'DELETE')).status).toBe(200);
    expectAudit('persona.delete', created.id);
    expect(mockDb().personas.some((row) => row.id === created.id)).toBe(false);
  });

  it('script create/update/delete retains native response/defaults and deduplicates destinations', async () => {
    const input = scriptUpsertSchema.parse({
      topic: 'Created script',
      groupIds: ['c1', 'c1'],
      lines: [{ personaId: 'ps1', body: 'Opening' }],
    });
    const response = await botRequest('/admin/scripts', 'POST', input);
    expect(response.status).toBe(201);
    const created = scriptSchema.parse(await response.json());
    expect(created).toMatchObject({
      topic: input.topic,
      groupIds: ['c1'],
      runAt: null,
      delayMinutes: 5,
    });
    expectAudit('script.create', created.id);
    const updated = await botRequest(`/admin/scripts/${created.id}`, 'PATCH', {
      ...input,
      topic: 'Renamed script',
    });
    expect(updated.status).toBe(200);
    expect(scriptSchema.parse(await updated.json()).topic).toBe('Renamed script');
    expectAudit('script.update', created.id);
    expect((await botRequest(`/admin/scripts/${created.id}`, 'DELETE')).status).toBe(200);
    expectAudit('script.delete', created.id);
  });

  it('manual replay audits each explicit command, while stop replay409 creates no phantom audit', async () => {
    for (let i = 0; i < 2; i++)
      expect((await botRequest('/admin/scripts/sc1/run', 'POST')).status).toBe(202);
    expect(auditLog().filter((row) => row.action === 'script.run')).toHaveLength(2);
    expect(botState().audit.filter((row) => row.action === 'script.run')).toHaveLength(2);
    expect((await botRequest('/admin/bot/threads/th3/stop', 'POST')).status).toBe(200);
    expectAudit('bot_thread.stop', 'th3');
    const count = auditLog().length;
    expect((await botRequest('/admin/bot/threads/th3/stop', 'POST')).status).toBe(409);
    expect(auditLog()).toHaveLength(count);
  });

  it('settings update preserves other values and emits one actor-tagged shared/private audit', async () => {
    const previous = structuredClone(mockDb().botSettings);
    const response = await botRequest('/admin/bot/settings', 'PATCH', { autoGenerate: false });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...previous, autoGenerate: false });
    expectAudit('bot_settings.update', 'bot');
  });
});
