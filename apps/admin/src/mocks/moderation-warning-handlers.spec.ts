import { setupServer } from 'msw/node';
import { reportSchema } from '@opchub/shared/api-domains';
import {
  auditLog,
  inboxNotifications,
  mockDb,
  pendingMockModerationWarnings,
  reportMessage,
  resetMockDb,
  sendChatMessage,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
  mockDb().botSettings.enabled = false;
  mockDb().notifications.clear();
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

it('REQ-207 NA-07 actual Admin warn resolves/audits once and commits a deferred recipient warning', async () => {
  const sent = sendChatMessage('m1', 'c1-general', {
    clientMsgId: 'admin-warning',
    kind: 'text',
    body: 'Source',
    mentions: [],
  });
  if (!sent.ok) throw new Error(sent.message);
  const report = reportMessage(sent.data.id, { reason: 'other' });
  if (!report.ok) throw new Error(report.message);
  const send = () =>
    fetch(`${location.origin}/v1/admin/reports/${report.data.id}/action`, {
      method: 'POST',
      headers: { Authorization: 'Bearer mock.admin', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'warn' }),
    });
  const response = await send();
  expect(response.status).toBe(200);
  expect(reportSchema.parse(await response.json()).status).toBe('resolved');
  expect(pendingMockModerationWarnings()).toBe(1);
  expect(mockDb().notifications.get('m1') ?? []).toEqual([]);
  expect(inboxNotifications('m1', Date.now())).toHaveLength(1);
  expect((await send()).status).toBe(409);
  expect(
    auditLog().filter((row) => row.action === 'moderation.warn' && row.target === report.data.id),
  ).toHaveLength(1);
  expect(inboxNotifications('m1', Date.now())).toHaveLength(1);
});
