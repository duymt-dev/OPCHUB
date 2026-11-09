import { adminBadgesSchema, adminOverviewSchema } from '@opchub/shared/api-domains';
import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const get = async (path: string): Promise<unknown> => (await fetch(`${BASE}${path}`)).json();

describe('MSW B60 — Tổng quan + badge theo hợp đồng server', () => {
  it('GET /admin/overview khớp adminOverviewSchema, số prototype v4 + Luồng hệ thống (D-89)', async () => {
    const o = adminOverviewSchema.parse(await get('/admin/overview'));
    expect(o.members.value).toBe(20000);
    expect(o.newThisMonth).toBe(2165);
    expect(o.events).toMatchObject({ value: 12, upcoming: 4 });
    expect(o.paid).toEqual({ value: 4218, newThisMonth: 452, deltaPct: 12 });
    expect(o.flow).toEqual({
      paidMembers: 5,
      members: 10,
      stores: { published: 17, hidden: 0, draft: 0 },
      needs: { open: 11, closed: 0 },
      projects: { pending: 2, published: 11 },
      groups: 90,
    });
    expect(o.growth.map((g) => g.month)).toEqual(['T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10']);
  });

  it('GET /admin/badges khớp adminBadgesSchema', async () => {
    const b = adminBadgesSchema.parse(await get('/admin/badges'));
    expect(b.reports).toBeGreaterThanOrEqual(0);
    expect(b.projects).toBeGreaterThanOrEqual(0);
    expect(b.requests).toBeGreaterThanOrEqual(0);
  });

  it('GET /admin/overview?period=week trả nhãn tuần W40..W46 và ?from=...&to=... đổi range', async () => {
    const oWeek = adminOverviewSchema.parse(await get('/admin/overview?period=week'));
    expect(oWeek.growth.map((g) => g.month)).toEqual([
      'W40',
      'W41',
      'W42',
      'W43',
      'W44',
      'W45',
      'W46',
    ]);

    const oCustom = adminOverviewSchema.parse(
      await get('/admin/overview?from=2026-10-01&to=2026-10-15'),
    );
    expect(oCustom.range).toEqual({ from: '2026-10-01', to: '2026-10-15' });
  });
});
