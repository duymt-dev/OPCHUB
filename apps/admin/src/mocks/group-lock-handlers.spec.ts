import { groupDetailSchema } from '@opchub/shared/api-domains';
import {
  auditLog,
  mockDb,
  pendingMockGroupOwnerLocks,
  resetMockDb,
} from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const request = (path: string, body?: unknown) =>
  fetch(`${location.origin}/v1/admin${path}`, {
    method: body === undefined ? 'GET' : 'PATCH',
    headers: { Authorization: 'Bearer mock.admin', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

it('D-55 NA-16 UAT-24 actual status/detail endpoints expose permanent Admin ownership and system audit', async () => {
  const initial = groupDetailSchema.parse(await (await request('/groups/c1')).json());
  expect(initial.ownerId).toBe('m1');
  expect((await request('/users/m1/status', { status: 'locked' })).status).toBe(200);
  expect(pendingMockGroupOwnerLocks()).toBe(1);
  const response = await request('/groups/c1');
  expect(response.status).toBe(200);
  const moved = groupDetailSchema.parse(await response.json());
  expect(moved).toMatchObject({ ownerId: 'admin', memberCount: initial.memberCount + 1 });
  expect(mockDb().groupMembers.get('m1')?.get('c1')).toBe('member');
  expect(auditLog().filter((row) => row.action === 'group.owner_transfer')).toHaveLength(2);
  expect(
    auditLog().find((row) => row.action === 'group.owner_transfer' && row.target === 'c1'),
  ).toMatchObject({ actorId: null, diff: { from: 'm1', to: 'admin', reason: 'locked' } });
  expect((await request('/users/m1/status', { status: 'active' })).status).toBe(200);
  expect(groupDetailSchema.parse(await (await request('/groups/c1')).json()).ownerId).toBe('admin');
});
