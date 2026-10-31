import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { RevenuePayoutService } from '@/modules/affiliate';
import { loadEnv } from '@/common/config';
import { assertRevenueTestTarget, drainRevenueTestOutbox } from '../setup/revenue-outbox-drain';
import { createRevenueApp, createRevenueCase, type RevenueCase } from './revenue-sharing.fixture';
import type { TestApp } from '../setup/test-app';

describe('REQ-617 integration revenue teardown preserves outbox evidence', () => {
  let t: TestApp;
  let c: RevenueCase;
  const extra: bigint[] = [];
  beforeAll(async () => {
    t = await createRevenueApp();
    await drainRevenueTestOutbox(t.app);
  });
  beforeEach(async () => {
    c = await createRevenueCase(t);
  });
  afterEach(async () => {
    await t.prisma.db.outboxEvent.deleteMany({ where: { id: { in: extra.splice(0) } } });
    await c.cleanup();
  });
  afterAll(async () => {
    await t.close();
  });

  it('drains multiple batches via the real consumer, preserves unrelated events and replays without duplicate shares', async () => {
    const u = await c.customer();
    const period = await c.collect(u.id, '2026-09-01T00:00:00Z');
    const event = await c.payload(period.id);
    await t.prisma.db.outboxEvent.createMany({
      data: Array.from({ length: 104 }, (_, i) => ({
        type: 'affiliate.revenue_received',
        payload: {
          ...event.data,
          receipt: { ...event.data.receipt, sourceId: `${period.id}-batch-${i}` },
        },
      })),
    });
    const unrelated = await t.prisma.db.outboxEvent.create({
      data: { type: 'test.unrelated', payload: {} },
    });
    extra.push(unrelated.id);
    expect(await drainRevenueTestOutbox(t.app)).toBe(105);
    expect(await t.prisma.db.revenueShare.count({ where: { customerId: u.id } })).toBe(105);
    expect(
      await t.prisma.db.revenueShare.findUniqueOrThrow({
        where: { source_sourceId: { source: 'membership', sourceId: period.id } },
      }),
    ).toMatchObject({ amount: 101, directorAmount: 51, mediaSoftAmount: 50 });
    expect(
      (await t.prisma.db.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).dispatchedAt,
    ).not.toBeNull();
    expect(
      await t.prisma.db.outboxEvent.findUniqueOrThrow({ where: { id: unrelated.id } }),
    ).toEqual(unrelated);
    expect(await drainRevenueTestOutbox(t.app)).toBe(0);
    expect(await t.prisma.db.revenueShare.count({ where: { customerId: u.id } })).toBe(105);
  });

  it('dispatches the real payout notification once before allowing a later seed reset', async () => {
    const u = await c.customer();
    await c.collect(u.id, '2026-09-01T00:00:00Z');
    expect(await drainRevenueTestOutbox(t.app)).toBe(1);
    const payout = await t.app
      .get(RevenuePayoutService)
      .record(
        { id: c.actor.id, ip: null },
        c.director.id,
        '2026-09',
        randomUUID(),
        new Date('2026-10-01'),
      );
    const where = { id: `revenue:payout:${payout.id}` };
    expect(await t.prisma.db.notification.count({ where })).toBe(0);
    expect(await drainRevenueTestOutbox(t.app)).toBe(1);
    expect(await t.prisma.db.notification.findUniqueOrThrow({ where })).toMatchObject({
      userId: c.director.id,
    });
    expect(await drainRevenueTestOutbox(t.app)).toBe(0);
    expect(await t.prisma.db.notification.count({ where })).toBe(1);
  });

  it('fails closed on invalid payload without deleting or fake-dispatching it', async () => {
    const row = await t.prisma.db.outboxEvent.create({
      data: { type: 'affiliate.revenue_received', payload: {} },
    });
    extra.push(row.id);
    await expect(drainRevenueTestOutbox(t.app)).rejects.toThrow('cannot drain');
    expect(
      await t.prisma.db.outboxEvent.findUniqueOrThrow({ where: { id: row.id } }),
    ).toMatchObject({ dispatchedAt: null, attempts: 1, payload: {} });
  });

  it('respects an existing lease instead of stealing it to make the suite green', async () => {
    const u = await c.customer();
    const period = await c.collect(u.id, '2026-09-01T00:00:00Z');
    const event = await c.payload(period.id);
    const until = new Date(Date.now() + 60_000);
    await t.prisma.db.outboxEvent.update({ where: { id: event.id }, data: { lockedUntil: until } });
    await expect(drainRevenueTestOutbox(t.app)).rejects.toThrow('cannot drain');
    expect(
      await t.prisma.db.outboxEvent.findUniqueOrThrow({ where: { id: event.id } }),
    ).toMatchObject({ dispatchedAt: null, lockedUntil: until, attempts: 0 });
  });

  it('rejects dev DB, remote DB, wrong port, Redis1 and non-test runtime before connecting', () => {
    const env = loadEnv();
    expect(() => assertRevenueTestTarget(env)).not.toThrow();
    for (const patch of [
      { DATABASE_URL: 'postgresql://localhost:5432/opchub_dev' },
      { DATABASE_URL: 'postgresql://example.invalid:5432/opchub_test' },
      { DATABASE_URL: 'postgresql://localhost:5433/opchub_test' },
      { REDIS_DB: 1 },
      { NODE_ENV: 'production' as const },
    ])
      expect(() => assertRevenueTestTarget({ ...env, ...patch })).toThrow('requires native');
  });
});
