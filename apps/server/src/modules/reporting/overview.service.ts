import { Injectable } from '@nestjs/common';
import {
  type AdminBadges,
  type AdminOverview,
  type AdminOverviewQuery,
  adminOverviewSchema,
} from '@opchub/shared/api-domains';
import { type AccessClaims, PermissionCheck } from '@/common/auth';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { OverviewFlowRepository } from './overview-flow.repository';
import { OverviewSeriesRepository } from './overview-series.repository';
import { deltaPct, lastMonths, lastWeeks, lastYears, overviewRange } from './overview-intervals';
export { deltaPct, lastMonths, lastWeeks, lastYears } from './overview-intervals';

const CACHE_KEY = 'admin:overview';
const CACHE_SEC = 60;
/**
 * Admin Tổng quan (B44). KPI = đếm hiện tại trên index; sparkline + tăng trưởng = `stats_daily`
 * (ngày chụp gần nhất mỗi tháng — 1 query). Cache Redis 60 giây (S-03).
 */
@Injectable()
export class OverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly perms: PermissionCheck,
    private readonly flow: OverviewFlowRepository,
    private readonly seriesRepo: OverviewSeriesRepository,
  ) {}

  async overview(now = new Date(), query?: AdminOverviewQuery): Promise<AdminOverview> {
    const period = query?.period ?? 'month';
    const { from, to } = overviewRange(now, query);
    const cacheKey = `${CACHE_KEY}:v2:${period}:${from}:${to}`;
    const hit = await this.redis.client.get(cacheKey);
    if (hit) {
      let cached: unknown;
      try {
        cached = JSON.parse(hit);
      } catch {
        cached = null;
      }
      const p = adminOverviewSchema.safeParse(cached);
      if (p.success) return p.data;
    }
    const value = await this.compute(now, query);
    await this.redis.client.set(cacheKey, JSON.stringify(value), 'EX', CACHE_SEC);
    return value;
  }

  /** Badge theo quyền người gọi (luật 4: permission key) — guard đã chặn người không có khoá nào */
  async badges(user: AccessClaims): Promise<AdminBadges> {
    const can = await this.perms.checker(user);
    const db = this.prisma.db;
    const [reports, projects, requests] = await Promise.all([
      can('groups.view') ? db.report.count({ where: { status: 'open' } }) : 0,
      can('projects.view')
        ? db.project.count({ where: { status: 'pending_review', deletedAt: null } })
        : 0,
      // D-72 (Q-V4-605-2): không còn trạng thái — phiếu chưa có ghi chú nội bộ nào là "mới"
      can('services.view') ? db.serviceRequest.count({ where: { comments: { none: {} } } }) : 0,
    ]);
    return { reports, projects, requests };
  }

  private async compute(now: Date, query?: AdminOverviewQuery): Promise<AdminOverview> {
    const period = query?.period ?? 'month';
    const months = lastMonths(now);
    const intervals =
      period === 'week' ? lastWeeks(now) : period === 'year' ? lastYears(now) : months;
    const range = overviewRange(now, query);
    const [totals, growthSeries, monthSeries, paid, flow] = await Promise.all([
      this.seriesRepo.totals(now, range.start, range.end),
      this.seriesRepo.series(intervals, period),
      period === 'month' ? Promise.resolve(null) : this.seriesRepo.series(months, 'month'),
      this.flow.paid(range.start, range.end),
      this.flow.counts(),
    ]);
    const { members, communities, projects, pending, events, upcoming, fresh, groupsNew } = totals;

    const activeMonthlySeries = monthSeries ?? growthSeries;
    const pickMonthly = (metric: string) =>
      months.map((m) => activeMonthlySeries.get(`${m.key}|${metric}`) ?? 0);

    const pickGrowth = (metric: string) =>
      intervals.map((m) => growthSeries.get(`${m.key}|${metric}`) ?? 0);
    const active = pickGrowth('members_active');
    const freshGrowth = pickGrowth('members_new_sum');
    const inactive = pickGrowth('members_inactive');

    return {
      // BUG-029: khoảng = đầu tháng → hôm nay (VN); delta và số mới tháng này tính thật
      range: { from: range.from, to: range.to },
      membersDeltaPct: deltaPct(members, fresh),
      newThisMonth: fresh,
      newMembersSpark: pickMonthly('members_new_sum'),
      communitiesNew: groupsNew,
      members: { value: members, spark: pickMonthly('members_total') },
      communities: { value: communities, spark: pickMonthly('groups') },
      projects: { value: projects, pending, spark: pickMonthly('projects_live') },
      events: { value: events, upcoming, spark: pickMonthly('events_upcoming') },
      paid: { ...paid, deltaPct: deltaPct(paid.value, paid.newThisMonth) },
      flow: {
        ...flow,
        paidMembers: paid.value,
        members,
        projects: { pending, published: projects },
        groups: communities,
      },
      growth: intervals.map((m, i) => ({
        month: m.label,
        active: active[i] ?? 0,
        fresh: freshGrowth[i] ?? 0,
        inactive: inactive[i] ?? 0,
      })),
    };
  }
}
