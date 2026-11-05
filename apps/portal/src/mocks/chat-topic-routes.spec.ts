import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

describe('REQ-209 D-61 Portal has no topic creation/deletion routes', () => {
  it.each([
    ['POST', '/groups/c1/rooms'],
    ['DELETE', '/rooms/c1-general'],
  ])('%s %s returns native 404 without falling through to network', async (method, path) => {
    const res = await fetch(`${location.origin}/v1${path}`, {
      method,
      headers: { Authorization: 'Bearer mock.m1', 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify({ name: 'Forbidden topic' }) } : {}),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});
