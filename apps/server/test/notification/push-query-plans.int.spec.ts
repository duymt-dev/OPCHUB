import { appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPrismaClient, type DbClient, Prisma } from '@opchub/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '@/common/config';
import { eventReminders1hQuery } from '@/modules/event/repositories/event-sweep.repository';
import { needAudienceQuery } from '@/modules/local-business/repositories/need-match-audience.query';
import { storeDigestQuery } from '@/modules/local-business/repositories/store-digest.query';
import { pushTargetsQuery } from '@/modules/notification/repositories/push-targets.query';
import { PUSH_PLAN_FIXTURE } from './push-query-plans.fixture';

const report = resolve('../../test-results/v46-816-query-plans.jsonl');
interface Node {
  kind: string;
  relation: string;
  index: string;
}
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const own =
    typeof record['Node Type'] === 'string'
      ? [
          {
            kind: record['Node Type'],
            relation: typeof record['Relation Name'] === 'string' ? record['Relation Name'] : '',
            index: typeof record['Index Name'] === 'string' ? record['Index Name'] : '',
          },
        ]
      : [];
  return [...own, ...Object.values(record).flatMap(nodes)];
}
describe('D-137 push/source indexed query plans on 10000-row native PostgreSQL fixtures', () => {
  let db: DbClient;
  beforeAll(async () => {
    db = createPrismaClient(loadEnv().DATABASE_URL, { max: 1 });
    await db.$executeRawUnsafe(PUSH_PLAN_FIXTURE);
    writeFileSync(report, '');
  });
  afterAll(async () => {
    await db?.$disconnect();
  });
  async function plan(name: string, query: Prisma.Sql, table: string, index: string) {
    const raw = await db.$queryRaw<unknown[]>(
      Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
    );
    const scanned = nodes(raw);
    appendFileSync(report, JSON.stringify({ name, raw }) + '\n');
    expect(scanned.some((n) => n.index === index)).toBe(true);
    expect(scanned.filter((n) => n.relation === table).some((n) => n.kind === 'Seq Scan')).toBe(
      false,
    );
  }
  it('seeks subscriptions by realm/owner before fetching endpoint keys', async () => {
    await plan(
      'subscriptions',
      pushTargetsQuery(['n10000']),
      'push_subscriptions',
      'plan_subscriptions_owner',
    );
  });
  it('prefilters matching store audience before wide intro/product payloads', async () => {
    await plan(
      'need audience',
      needAudienceQuery(
        {
          id: 'need',
          ownerId: 'poster',
          type: 'buy',
          title: 'Target need',
          description: '',
          field: 'target',
          fieldCustom: false,
          province: 'target',
          updatedAt: new Date(),
        },
        new Date(),
      ),
      'stores',
      'plan_stores_field',
    );
  });
  it('seeks yesterday store views through a partial covering day/store index', async () => {
    await plan(
      'store digest',
      storeDigestQuery('2086-08-16', '', new Date()),
      'store_daily_views',
      'plan_store_views_digest',
    );
  });
  it('claims the 1h event range without scanning other future events', async () => {
    await plan('event 1h', eventReminders1hQuery(new Date()), 'events', 'plan_events_remind');
  });
});
