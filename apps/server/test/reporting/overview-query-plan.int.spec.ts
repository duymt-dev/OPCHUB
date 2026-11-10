import { afterAll, beforeAll, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { createPrismaClient, Prisma, type DbClient } from '@opchub/db';
import { loadEnv } from '@/common/config';
import type { PrismaService } from '@/common/prisma/prisma.service';
import { lastMonths, lastWeeks, lastYears } from '@/modules/reporting';
import { OverviewSeriesRepository } from '@/modules/reporting/overview-series.repository';

const events: Prisma.QueryEvent[] = [];
let db: DbClient;
const lower = new Date('2070-01-01');
const upper = new Date('2080-02-12');

beforeAll(() => {
  const url = loadEnv().DATABASE_URL;
  const target = new URL(url);
  if (!target.pathname.endsWith('_test')) {
    throw new Error('This large fixture requires a test database');
  }
  db = createPrismaClient(url, { onQuery: (event) => events.push(event), max: 2 });
});
afterAll(async () => {
  if (db) await db.$disconnect();
});

/** Rebind the exact production SQL captured by Prisma, without an unsafe raw-query API. */
function capturedSql(event: Prisma.QueryEvent) {
  const values = z.array(z.string()).parse(JSON.parse(event.params));
  const slots = [...event.query.matchAll(/\$(\d+)/g)];
  return Prisma.sql(
    event.query.split(/\$\d+/),
    ...slots.map((slot) => values[Number(slot[1]) - 1]),
  );
}

it('REQ-122 production overview SQL plans on representative daily metrics and dimensions', async () => {
  expect(await db.statsDaily.count({ where: { day: { gte: lower, lte: upper } } })).toBe(0);
  try {
    await db.$executeRaw`
      INSERT INTO stats_daily(day, metric, dimension, value)
      SELECT d::date, m, CASE WHEN n = 0 THEN '' ELSE 'province-' || n END, 10
      FROM generate_series(${lower}::date, ${upper}::date, interval '1 day') d
      CROSS JOIN unnest(ARRAY['members_total','members_active','members_inactive',
        'groups','projects_live','events_upcoming','members_new']) m
      CROSS JOIN generate_series(0, 34) n`;
    await db.$executeRaw`VACUUM (ANALYZE) stats_daily`;
    const count = await db.statsDaily.count({ where: { day: { gte: lower, lte: upper } } });
    expect(count).toBeGreaterThan(10_000);
    const repository = new OverviewSeriesRepository({ db } as PrismaService);
    const now = new Date('2080-02-12T08:00:00Z');
    const plans: { period: string; sql: string; parameters: string[]; plan: unknown }[] = [];
    for (const period of ['week', 'month', 'year'] as const) {
      events.length = 0;
      const intervals =
        period === 'week' ? lastWeeks(now) : period === 'month' ? lastMonths(now) : lastYears(now);
      const series = await repository.series(intervals, period);
      for (const bucket of intervals) {
        expect(series.get(`${bucket.key}|members_active`)).toBe(10);
        expect(series.get(`${bucket.key}|members_inactive`)).toBe(10);
        const days = (Date.parse(bucket.day) - Date.parse(bucket.start)) / 86_400_000 + 1;
        expect(series.get(`${bucket.key}|members_new_sum`)).toBe(days * 10);
      }
      const queries = events.filter((event) => /FROM stats_daily/.test(event.query));
      expect(queries).toHaveLength(2);
      for (const event of queries) {
        const result = await db.$queryRaw<{ 'QUERY PLAN': unknown }[]>(Prisma.sql`
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${capturedSql(event)}`);
        plans.push({
          period,
          sql: event.query,
          parameters: z.array(z.string()).parse(JSON.parse(event.params)),
          plan: result[0]?.['QUERY PLAN'],
        });
      }
    }
    const dir = resolve('../../coding-packs/reports/evidence/v46-823');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      resolve(dir, 'native-query-plans.json'),
      JSON.stringify(
        {
          rows: count,
          source: 'OverviewSeriesRepository.series via Prisma onQuery; no planner forcing',
          plans,
        },
        null,
        2,
      ) + '\n',
    );
    expect(plans).toHaveLength(6);
    expect(plans.every((entry) => JSON.stringify(entry.plan).includes('Index Only Scan'))).toBe(
      true,
    );
    expect(plans.some((entry) => JSON.stringify(entry.plan).includes('Seq Scan'))).toBe(false);
  } finally {
    await db.statsDaily.deleteMany({ where: { day: { gte: lower, lte: upper } } });
    await db.$executeRaw`VACUUM (ANALYZE) stats_daily`;
  }
}, 120_000);
