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
  it('GET /admin/overview khớp adminOverviewSchema, số prototype', async () => {
    const o = adminOverviewSchema.parse(await get('/admin/overview'));
    expect(o.members.value).toBe(4218);
    expect(o.projects.pending).toBe(2);
    expect(o.growth.map((g) => g.month)).toEqual(['T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10']);
  });

  it('GET /admin/badges khớp adminBadgesSchema', async () => {
    const b = adminBadgesSchema.parse(await get('/admin/badges'));
    expect(b.reports).toBeGreaterThanOrEqual(0);
    expect(b.projects).toBeGreaterThanOrEqual(0);
    expect(b.requests).toBeGreaterThanOrEqual(0);
  });
});
