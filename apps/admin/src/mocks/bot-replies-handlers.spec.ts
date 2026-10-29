import { setupServer } from 'msw/node';
import {
  botReplyOverviewSchema,
  botReplyScanResultSchema,
  botReplySettingsSchema,
} from '@opchub/shared/api-domains';
import { apiErrorSchema } from '@opchub/shared/api';
import {
  auditLog,
  botState,
  mockDb,
  patchMockBotSchedule,
  sendChatMessage,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';
import { botContractFixture, botRequest } from './tests/bot-contract.fixture';

const server = setupServer(...handlers);
const base = '/admin/bot/replies';
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  botContractFixture();
  mockDb().botSettings.replyToMembers = false;
  botState().threads = [];
  mockDb().messages.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
});
afterEach(() => vi.useRealTimers());

it('strictly reads the same settings/overview/run contracts and shares the existing auto toggle', async () => {
  const settings = await botRequest(`${base}/settings`);
  expect(settings.status).toBe(200);
  expect(botReplySettingsSchema.parse(await settings.json())).toEqual({
    autoEnabled: false,
    sampleSize: 50,
    delaySeconds: 5,
  });
  const patched = await botRequest(`${base}/settings`, 'PATCH', {
    autoEnabled: true,
    sampleSize: 12,
    delaySeconds: 7,
  });
  expect(patched.status).toBe(200);
  expect(botReplySettingsSchema.parse(await patched.json()).sampleSize).toBe(12);
  expect(mockDb().botSettings.replyToMembers).toBe(true);
  expect(botReplyOverviewSchema.parse(await (await botRequest(base)).json())).toMatchObject({
    pendingTotal: 0,
    groupCount: 0,
    history: [],
    run: null,
  });
  expect(botReplyScanResultSchema.parse(await (await botRequest(`${base}/run`)).json())).toEqual({
    run: null,
  });
  expect(botState().audit.filter((row) => row.action === 'bot.reply_settings.update')).toHaveLength(
    1,
  );
  expect(auditLog().filter((row) => row.action === 'bot.reply_settings.update')).toHaveLength(1);
});

it('manual202 scan works with auto off, coalesces active runs and audits stop without publication', async () => {
  const db = mockDb();
  const persona = db.personas[0];
  if (!persona) throw new Error('Missing persona');
  persona.enabled = true;
  persona.groupIds = ['c1'];
  db.groupMembers.set('m1', new Map([['c1', 'member']]));
  const sent = sendChatMessage('m1', 'c1-general', {
    clientMsgId: 'manual-handler',
    kind: 'text',
    body: 'Câu hỏi mới',
    mentions: [],
  });
  expect(sent.ok).toBe(true);
  const first = await botRequest(`${base}/scan`, 'POST', {});
  expect(first.status).toBe(202);
  const run = botReplyScanResultSchema.parse(await first.json()).run;
  expect(run).toMatchObject({ manual: true, total: 1, processed: 0 });
  const repeated = await botRequest(`${base}/scan`, 'POST', {});
  expect(botReplyScanResultSchema.parse(await repeated.json()).run?.id).toBe(run?.id);
  const stopped = await botRequest(`${base}/${run?.id}/stop`, 'POST');
  expect(stopped.status).toBe(200);
  expect(botReplyScanResultSchema.parse(await stopped.json()).run?.status).toBe('stopped');
  expect((await botRequest(`${base}/${run?.id}/stop`, 'POST')).status).toBe(409);
  expect((await botRequest(`${base}/missing/stop`, 'POST')).status).toBe(404);
  expect(db.botMessageMeta.size).toBe(0);
  expect(botState().audit.map((row) => row.action)).toEqual([
    'bot.reply.stop',
    'bot.reply.scan',
    'bot.reply.scan',
  ]);
  expect(auditLog()).toHaveLength(3);
});

it.each([
  { sampleSize: 0 },
  { sampleSize: 201 },
  { delaySeconds: 601 },
  { autoEnabled: 'true' },
  { extra: 1 },
])('rejects invalid settings %j atomically with field errors and no audits', async (body) => {
  const before = structuredClone(botState().replies);
  const response = await botRequest(`${base}/settings`, 'PATCH', body);
  expect(response.status).toBe(400);
  expect(apiErrorSchema.parse(await response.json()).error.fields?.length).toBeGreaterThan(0);
  expect(botState().replies).toEqual(before);
  expect(botState().audit).toHaveLength(0);
  expect(auditLog()).toHaveLength(0);
});

it('enforces401/403/413, strict scan commands and global-pause409 without mutation/audit', async () => {
  for (const path of [base, `${base}/settings`, `${base}/run`])
    expect((await botRequest(path, 'GET', undefined, '')).status).toBe(401);
  for (const [path, method] of [
    [`${base}/settings`, 'PATCH'],
    [`${base}/scan`, 'POST'],
    [`${base}/missing/stop`, 'POST'],
  ]) {
    expect((await botRequest(path!, method, {}, '')).status).toBe(401);
    expect((await botRequest(path!, method, {}, 'adm-hang')).status).toBe(403);
  }
  expect((await botRequest(`${base}/scan`, 'POST', { groupId: 'c1' })).status).toBe(400);
  expect(
    (await botRequest(`${base}/settings`, 'PATCH', { sampleSize: 'x'.repeat(2_000_000) })).status,
  ).toBe(413);
  patchMockBotSchedule({ paused: true });
  expect((await botRequest(`${base}/scan`, 'POST', {})).status).toBe(409);
  expect(botState().audit).toHaveLength(0);
  expect(auditLog()).toHaveLength(0);
});
