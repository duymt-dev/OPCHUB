import { loginResponseSchema } from '@opchub/shared/api';
import { chatOverviewSchema, chatMessageSchema } from '@opchub/shared/api-domains';
import { demoAccounts } from '@opchub/shared/fixtures';
import {
  drainMockGroupOwnerLocks,
  mockDb,
  resetMockDb,
  setUserStatus,
} from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { clearMockSession } from './handlers/mock-auth-session';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  mockDb().botSettings.enabled = false;
  clearMockSession();
});
afterEach(() => clearMockSession());
afterAll(() => server.close());

it('D-55 NA-16 UAT-24 unlocked former owner rejoins with fresh access as ordinary member, not Chat owner', async () => {
  const account = demoAccounts.find((row) => row.meId === 'm1');
  if (!account) throw new Error('Missing login fixture');
  setUserStatus('m1', 'locked');
  expect(drainMockGroupOwnerLocks()).toBe(2);
  setUserStatus('m1', 'active');
  const login = await fetch(`${location.origin}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: account.email, password: account.pwd }),
  });
  expect(login.status).toBe(200);
  const session = loginResponseSchema.parse(await login.json());
  const headers = {
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
  };
  const overview = await fetch(`${location.origin}/v1/me/chat`, { headers });
  expect(overview.status).toBe(200);
  const chat = chatOverviewSchema.parse(await overview.json());
  expect(chat.joined.find((row) => row.id === 'c1')).toMatchObject({ isOwner: false });
  expect(chat.joined.find((row) => row.id === 'c6')).toMatchObject({ isOwner: false });
  const sent = await fetch(`${location.origin}/v1/rooms/c1-general/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      clientMsgId: crypto.randomUUID(),
      kind: 'text',
      body: 'After unlock',
      mentions: [],
    }),
  });
  expect(sent.status).toBe(201);
  const message = chatMessageSchema.parse(await sent.json());
  expect(message).toMatchObject({
    senderId: 'm1',
    senderRole: null,
  });
  const pin = await fetch(`${location.origin}/v1/messages/${message.id}/pin`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ pinned: true }),
  });
  expect(pin.status).toBe(403);
});
