import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import type { OverviewPeriod } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { OverviewInterval } from './overview-intervals';

const METRICS = [
  'members_total',
  'members_active',
  'members_inactive',
  'groups',
  'projects_live',
  'events_upcoming',
];

@Injectable()
export class OverviewSeriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** D-140: totals stay current; only new registrations use the selected range. */
  async totals(now: Date, start: Date, end: Date) {
    const db = this.prisma.db;
    const live = { deletedAt: null, systemRole: 'member' } as const;
    const [members, communities, projects, pending, events, upcoming, fresh, groupsNew] =
      await Promise.all([
        db.user.count({ where: live }),
        db.group.count({ where: { deletedAt: null } }),
        db.project.count({ where: { status: 'published', deletedAt: null } }),
        db.project.count({ where: { status: 'pending_review', deletedAt: null } }),
        db.event.count(),
        db.event.count({ where: { startsAt: { gte: now } } }),
        db.user.count({ where: { ...live, createdAt: { gte: start, lt: end } } }),
        db.group.count({ where: { deletedAt: null, createdAt: { gte: start, lt: end } } }),
      ]);
    return { members, communities, projects, pending, events, upcoming, fresh, groupsNew };
  }

  /** Bounded day scan; metric snapshots are not summed, daily new members are. */
  async series(
    intervals: OverviewInterval[],
    period: OverviewPeriod,
  ): Promise<Map<string, number>> {
    const first = intervals[0]?.start;
    const last = intervals.at(-1)?.day;
    const format = period === 'week' ? 'IYYY-"W"IW' : period === 'year' ? 'YYYY' : 'YYYY-MM';
    const [snap, fresh] = await Promise.all([
      this.prisma.db.$queryRaw<{ ym: string; metric: string; value: bigint }[]>(Prisma.sql`
        SELECT DISTINCT ON (ym, metric) to_char(day, ${format}) AS ym, metric, value
        FROM stats_daily
        WHERE day BETWEEN ${first}::date AND ${last}::date AND dimension = ''
          AND metric IN (${Prisma.join(METRICS)})
        ORDER BY ym, metric, day DESC`),
      this.prisma.db.$queryRaw<{ ym: string; value: bigint }[]>(Prisma.sql`
        SELECT to_char(day, ${format}) AS ym, sum(value)::bigint AS value
        FROM stats_daily
        WHERE day BETWEEN ${first}::date AND ${last}::date AND dimension = ''
          AND metric = 'members_new'
        GROUP BY 1`),
    ]);
    return new Map([
      ...snap.map((r): [string, number] => [`${r.ym}|${r.metric}`, Number(r.value)]),
      ...fresh.map((r): [string, number] => [`${r.ym}|members_new_sum`, Number(r.value)]),
    ]);
  }
}
