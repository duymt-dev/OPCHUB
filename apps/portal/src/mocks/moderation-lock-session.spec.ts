import { loginResponseSchema, meSchema } from '@opchub/shared/api';
import { demoAccounts } from '@opchub/shared/fixtures';
import { mockLogin } from '@opchub/shared/mock-data';
import {
  actOnReport,
  mockDb,
  reportMessage,
  resetMockDb,
  sendChatMessage,
  setUserStatus,
  userStatusOf,
} from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { clearMockSession, mockSessionResponse } from './handlers/mock-auth-session';

const server = setupServer(...handlers);
const account = (() => {
  const value = demoAccounts.find((row) => row.meId === 'm1');
  if (!value) throw new Error('Missing member login fixture');
  return value;
})();
const request = (path: string, token = 'mock.m1', method = 'GET', body?: unknown) =>
  fetch(`${location.origin}/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Cookie: document.cookie,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
async function session() {
  const login = mockLogin(account.email, account.pwd);
  if (!login.ok) throw new Error('Missing demo member');
  return loginResponseSchema.parse(await mockSessionResponse(login.me).json());
}
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  mockDb().botSettings.enabled = false;
  clearMockSession();
});
afterEach(() => clearMockSession());
afterAll(() => server.close());

describe('REQ-207 NA-16 UAT-24 moderation lock and existing member sessions', () => {
  it('locks the captured human sender and makes the existing access session403 without a test lock cookie', async () => {
    const active = await session();
    const sent = sendChatMessage('m1', 'c1-general', {
      clientMsgId: 'lock-source',
      kind: 'text',
      body: 'Source',
      mentions: [],
    });
    if (!sent.ok) throw new Error(sent.message);
    const report = reportMessage(sent.data.id, { reason: 'other' });
    if (!report.ok) throw new Error(report.message);
    expect(actOnReport(report.data.id, 'lock').ok).toBe(true);
    expect(userStatusOf('m1')).toBe('locked');
    expect((await request('/me', active.accessToken)).status).toBe(403);
  });

  it('revokes a refresh session when the account is locked', async () => {
    await session();
    setUserStatus('m1', 'locked');
    expect((await request('/auth/refresh', 'mock.m1', 'POST')).status).toBe(401);
  });

  it('unlock does not resurrect the old access or refresh session; a new login uses the same user ID', async () => {
    const old = await session();
    setUserStatus('m1', 'locked');
    setUserStatus('m1', 'active');
    expect((await request('/me', old.accessToken)).status).toBe(401);
    expect((await request('/auth/refresh', old.accessToken, 'POST')).status).toBe(401);
    const fresh = await session();
    expect(fresh.accessToken).not.toBe(old.accessToken);
    expect(fresh.me.id).toBe('m1');
    expect((await request('/me', fresh.accessToken)).status).toBe(200);
  });

  it('a correct password cannot create a new session while the account is locked', async () => {
    setUserStatus('m1', 'locked');
    expect(
      (
        await request('/auth/login', '', 'POST', {
          identifier: account.email,
          password: account.pwd,
        })
      ).status,
    ).toBe(403);
  });

  it('fresh non-default member tokens retain the correct user ID and cannot bypass protected auth routes with stale epochs', async () => {
    const initial = await request('/me', 'mock.m2');
    expect(initial.status).toBe(200);
    const me = meSchema.parse(await initial.json());
    setUserStatus('m2', 'locked');
    setUserStatus('m2', 'active');
    const fresh = loginResponseSchema.parse(await mockSessionResponse(me).json());
    expect(fresh.accessToken).toBe('mock.m2~2');
    const response = await request('/me', fresh.accessToken);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'm2' });
    expect((await request('/auth/sessions/revoke-others', 'mock.m2', 'POST')).status).toBe(401);
    expect((await request('/me', 'mock.m2~999')).status).toBe(401);
  });

  it('legacy Me-only refresh cookies work at epoch0 but never resurrect after lock/unlock', async () => {
    const active = await session();
    document.cookie = `opchub-msw-session=${encodeURIComponent(JSON.stringify(active.me))}; Path=/`;
    expect((await request('/auth/refresh', active.accessToken, 'POST')).status).toBe(200);
    document.cookie = `opchub-msw-session=${encodeURIComponent(JSON.stringify(active.me))}; Path=/`;
    setUserStatus('m1', 'locked');
    setUserStatus('m1', 'active');
    expect((await request('/auth/refresh', active.accessToken, 'POST')).status).toBe(401);
  });
});
