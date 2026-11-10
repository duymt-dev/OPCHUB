import { adminBadgesSchema, adminOverviewSchema } from '@opchub/shared/api-domains';
import { resetMockDb, mockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = location.origin + '/v1';
const headers = { Authorization: 'Bearer mock.admin' };
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-16T08:30:00Z'));
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());
const get = async (path: string): Promise<unknown> =>
  (await fetch(BASE + path, { headers })).json();

describe('REQ-122 MSW overview contract', () => {
  it('REQ-122 D-140 live totals agree with system flow', async () => {
    const o = adminOverviewSchema.parse(await get('/admin/overview'));
    expect(o.members.value).toBe(o.flow.members);
    expect(o.paid.value).toBe(o.flow.paidMembers);
    expect(o.communities.value).toBe(o.flow.groups);
    expect(o.newThisMonth).toBe(
      mockDb().fees.filter(
        (f) => f.joinedAt >= '2026-09-30T17:00:00.000Z' && f.joinedAt < '2026-10-16T17:00:00.000Z',
      ).length,
    );
    expect(o.growth.map((g) => g.month)).toEqual(['T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10']);
    expect(o.newMembersSpark).toEqual(o.growth.map((g) => g.fresh));
  });
  it('REQ-122 period aggregation and range change real cohort values not just labels', async () => {
    const all = adminOverviewSchema.parse(
      await get('/admin/overview?from=2000-01-01&to=2026-10-16'),
    );
    const empty = adminOverviewSchema.parse(
      await get('/admin/overview?from=1800-01-01&to=1800-01-01'),
    );
    expect(all.newThisMonth).toBeGreaterThan(0);
    expect(empty.newThisMonth).toBe(0);
    expect(empty.paid.newThisMonth).toBe(0);
    expect(empty.members).toEqual(all.members);
    expect(empty.flow).toEqual(all.flow);
    const week = adminOverviewSchema.parse(await get('/admin/overview?period=week'));
    const year = adminOverviewSchema.parse(await get('/admin/overview?period=year'));
    expect(week.growth).toHaveLength(7);
    expect(year.growth.map((g) => g.month)).toEqual(['2022', '2023', '2024', '2025', '2026']);
    expect(year.growth.at(-1)?.fresh).toBe(all.newMembersSpark.reduce((a, b) => a + b, 0));
    expect(week.newMembersSpark).toEqual(year.newMembersSpark);
  });
  it('REQ-122 rejects invalid query and unauthenticated access like server', async () => {
    for (const q of ['from=2026-02-29&to=2026-03-01', 'from=2026-01-01', 'period=bad']) {
      const response = await fetch(BASE + '/admin/overview?' + q, { headers });
      expect(response.status).toBe(400);
      const error: unknown = await response.json();
      expect(error).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
      expect(error).toHaveProperty('error.fields');
    }
    expect((await fetch(BASE + '/admin/overview')).status).toBe(401);
  });
  it('REQ-224 badge schema remains unchanged', async () => {
    expect(adminBadgesSchema.safeParse(await get('/admin/badges')).success).toBe(true);
  });
});
