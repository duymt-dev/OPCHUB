import { setupServer } from 'msw/node';
import { notificationListSchema, notificationReadResultSchema } from '@opchub/shared/api-domains';
import {
  actOnReport,
  mockDb,
  reportMessage,
  resetMockDb,
  sendChatMessage,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const request = (path: string, actor = 'm1', body?: unknown) =>
  fetch(`${location.origin}/v1${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer mock.${actor}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
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

function warning() {
  const sent = sendChatMessage('m1', 'c1-general', {
    clientMsgId: 'http-warning',
    kind: 'text',
    body: 'Warn this message',
    mentions: [],
  });
  if (!sent.ok) throw new Error(sent.message);
  const report = reportMessage(sent.data.id, { reason: 'other' });
  if (!report.ok) throw new Error(report.message);
  actOnReport(report.data.id, 'warn');
  return report.data.id;
}
describe('REQ-207 NA-07 Portal warning inbox HTTP', () => {
  it('shows the warned sender only, supports mark-read and preserves the actual publication timestamp', async () => {
    const id = warning();
    const response = await request('/notifications');
    expect(response.status).toBe(200);
    const first = notificationListSchema.parse(await response.json());
    expect(first.unread).toBe(1);
    expect(first.items[0]).toMatchObject({
      id: `moderation-warn-${id}`,
      type: 'group',
      link: '/chat/c1',
      createdAt: new Date().toISOString(),
    });
    const other = notificationListSchema.parse(
      await (await request('/notifications', 'm2')).json(),
    );
    expect(other).toMatchObject({ items: [], unread: 0 });
    const read = await request('/notifications/read', 'm1', { ids: [first.items[0]?.id] });
    expect(notificationReadResultSchema.parse(await read.json())).toEqual({ unread: 0 });
    vi.setSystemTime(Date.now() + 60000);
    const after = notificationListSchema.parse(await (await request('/notifications')).json());
    expect(after.items[0]).toEqual({ ...first.items[0], read: true });
  });
});
