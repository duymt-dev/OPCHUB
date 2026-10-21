import { setupServer } from 'msw/node';
import {
  auditLog,
  mockDb,
  mockMemberEpoch,
  mockMemberLockReason,
  reportMessage,
  resetMockDb,
  sendChatMessage,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const request = (path: string, method: string, body: unknown, actor = 'admin') =>
  fetch(`${location.origin}/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(actor ? { Authorization: `Bearer mock.${actor}` } : {}),
    },
    body: JSON.stringify(body),
  });
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  mockDb().botSettings.enabled = false;
});
afterAll(() => server.close());
function report() {
  const sent = sendChatMessage('m1', 'c1-general', {
    clientMsgId: 'http-lock',
    kind: 'text',
    body: 'Source',
    mentions: [],
  });
  if (!sent.ok) throw new Error(sent.message);
  const result = reportMessage(sent.data.id, { reason: 'other' });
  if (!result.ok) throw new Error(result.message);
  return result.data.id;
}
describe('REQ-207 NA-16 UAT-24 Admin actual moderation/member status controls', () => {
  it('groups.moderate can lock the actual sender with note, without requiring unrelated members.action', async () => {
    const id = report();
    expect(
      (
        await request(
          `/admin/reports/${id}/action`,
          'POST',
          { action: 'lock', note: '  Chat violation  ' },
          'adm-yen',
        )
      ).status,
    ).toBe(200);
    expect(mockDb().userStatus.get('m1')).toBe('locked');
    expect(mockMemberEpoch('m1')).toBe(1);
    expect(mockMemberLockReason('m1')).toBe('Chat violation');
    expect(auditLog()[0]).toMatchObject({
      actorId: 'adm-yen',
      action: 'user.lock',
      target: 'm1',
      diff: { reason: 'Chat violation' },
    });
    expect(
      (await request('/admin/users/m1/status', 'PATCH', { status: 'active' }, 'adm-yen')).status,
    ).toBe(403);
    expect((await request('/admin/users/m1/status', 'PATCH', { status: 'active' })).status).toBe(
      200,
    );
    expect(mockMemberEpoch('m1')).toBe(2);
  });

  it.each([
    ['PATCH', '/admin/users/m1/status', { status: 'locked' }],
    ['POST', '/admin/users/status', { userIds: ['m1'], status: 'locked' }],
  ] as const)(
    '%s %s requires members.action and leaves sessions/audit unchanged on denial',
    async (method, path, body) => {
      for (const [actor, status] of [
        ['', 401],
        ['m1', 401],
        ['adm-yen', 403],
      ] as const)
        expect((await request(path, method, body, actor)).status).toBe(status);
      expect(mockMemberEpoch('m1')).toBe(0);
      expect(auditLog()).toEqual([]);
    },
  );

  it('bulk lock/unlock uses native changed counts and retains per-account actor/reason audit', async () => {
    const first = await request('/admin/users/status', 'POST', {
      userIds: ['m1', 'm2', 'm1', 'missing'],
      status: 'locked',
      reason: 'Bulk reason',
    });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ updated: 2 });
    expect(auditLog().filter((row) => row.action === 'user.lock')).toHaveLength(2);
    expect(mockMemberEpoch('m1')).toBe(1);
    expect((await request('/admin/users/m1/status', 'PATCH', { status: 'locked' })).status).toBe(
      409,
    );
    expect(
      (await request('/admin/users/missing/status', 'PATCH', { status: 'locked' })).status,
    ).toBe(409);
  });

  it.each([
    ['PATCH', '/admin/users/m1/status'],
    ['POST', '/admin/users/status'],
    ['POST', '/admin/reports/missing/action'],
  ] as const)(
    '%s %s rejects malformed/oversized bodies without audit or epoch changes',
    async (method, path) => {
      for (const [body, status] of [
        ['{', 400],
        ['null', 400],
        ['"' + 'x'.repeat(768 * 1024) + '"', 413],
      ] as const) {
        const response = await fetch(`${location.origin}/v1${path}`, {
          method,
          headers: { Authorization: 'Bearer mock.admin', 'Content-Type': 'application/json' },
          body,
        });
        expect(response.status).toBe(status);
      }
      expect(mockMemberEpoch('m1')).toBe(0);
      expect(auditLog()).toEqual([]);
    },
  );
});
