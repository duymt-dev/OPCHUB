import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '@/common/prisma/prisma.service';
import type { RedisService } from '@/common/redis/redis.service';
import type { PermissionCheck } from '@/common/auth';
import type { OverviewFlowRepository } from './overview-flow.repository';
import type { OverviewSeriesRepository } from './overview-series.repository';
import { OverviewService } from './overview.service';
import { lastMonths } from './overview-intervals';

const now = new Date('2026-02-12T08:00:00Z');
function setup() {
  const cache = new Map<string, string>();
  const client = {
    get: vi.fn((key: string) => Promise.resolve(cache.get(key) ?? null)),
    set: vi.fn((key: string, value: string) => {
      cache.set(key, value);
      return Promise.resolve();
    }),
  };
  const series = new Map(lastMonths(now).map((m, i) => [m.key + '|members_new_sum', i + 1]));
  const repo = {
    totals: vi.fn().mockResolvedValue({
      members: 100,
      communities: 20,
      projects: 3,
      pending: 1,
      events: 4,
      upcoming: 2,
      fresh: 10,
      groupsNew: 2,
    }),
    series: vi.fn().mockResolvedValue(series),
  };
  const flow = {
    paid: vi.fn().mockResolvedValue({ value: 50, newThisMonth: 5 }),
    counts: vi.fn().mockResolvedValue({
      stores: { published: 1, hidden: 0, draft: 0 },
      needs: { open: 1, closed: 0 },
    }),
  };
  const service = new OverviewService(
    {} as PrismaService,
    { client } as unknown as RedisService,
    {} as PermissionCheck,
    flow as unknown as OverviewFlowRepository,
    repo as unknown as OverviewSeriesRepository,
  );
  return { service, client, cache, repo, flow };
}

describe('REQ-122 OverviewService', () => {
  it('REQ-122 isolates cache and preserves default response with TTL60', async () => {
    const h = setup();
    const first = await h.service.overview(now);
    expect(await h.service.overview(now, { period: 'month' })).toEqual(first);
    expect(h.repo.totals).toHaveBeenCalledTimes(1);
    expect(h.client.set).toHaveBeenCalledWith(
      'admin:overview:v2:month:2026-02-01:2026-02-12',
      JSON.stringify(first),
      'EX',
      60,
    );
    await h.service.overview(now, { period: 'week' });
    await h.service.overview(now, { period: 'year' });
    await h.service.overview(now, { period: 'month', from: '2020-01-01', to: '2020-01-02' });
    expect(h.cache.size).toBe(4);
    expect(first.members.value).toBe(first.flow.members);
    expect(first.newMembersSpark).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('REQ-122 ignores malformed and old payloads missing newMembersSpark', async () => {
    const h = setup();
    const current = await h.service.overview(now);
    const key = [...h.cache.keys()][0] ?? '';
    const old: Partial<typeof current> = { ...current };
    delete old.newMembersSpark;
    h.cache.set(key, JSON.stringify(old));
    expect((await h.service.overview(now)).newMembersSpark).toHaveLength(7);
    h.cache.set(key, '{bad');
    await h.service.overview(now);
    expect(h.repo.totals).toHaveBeenCalledTimes(3);
  });
  it('REQ-122 D-140 bounded cohorts, live totals, five years and monthly sparklines', async () => {
    const h = setup();
    const o = await h.service.overview(now, {
      period: 'year',
      from: '2024-02-29',
      to: '2024-02-29',
    });
    const start = new Date('2024-02-28T17:00:00Z'),
      end = new Date('2024-02-29T17:00:00Z');
    expect(h.repo.totals).toHaveBeenCalledWith(now, start, end);
    expect(h.flow.paid).toHaveBeenCalledWith(start, end);
    expect(o.growth.map((g) => g.month)).toEqual(['2022', '2023', '2024', '2025', '2026']);
    expect(o.newMembersSpark).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(o.membersDeltaPct).toBe(11.1);
    expect(o.paid.deltaPct).toBe(11.1);
  });
});
