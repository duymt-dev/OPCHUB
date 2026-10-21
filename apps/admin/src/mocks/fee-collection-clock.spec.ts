import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { feeRowSchema } from '@opchub/shared/api-domains';
import { resetMockDb } from '@opchub/shared/mock-domains';
import { adminMemberHandlers } from './handlers/admin-members';

const server = setupServer(...adminMemberHandlers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2027-03-01T05:06:07.123Z'));
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

it('AT-LK02 UAT-10 records the HTTP operation clock, not the fixture clock', async () => {
  const response = await fetch(`${location.origin}/v1/admin/fees/m6/collect`, { method: 'POST' });
  expect(response.status).toBe(200);
  expect(feeRowSchema.parse(await response.json())).toMatchObject({
    userId: 'm6',
    status: 'active',
    paidAt: '2027-03-01T05:06:07.123Z',
    validUntil: '2028-03-01T05:06:07.123Z',
  });
});
