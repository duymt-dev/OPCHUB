import { describe, it, expect, vi, afterEach } from 'vitest';
import { OutboxRelayService, OutboxService } from '@/common/outbox';
import { OutboxRepository } from '@/common/outbox/outbox.repository';
import { Prisma } from '@opchub/db';
import { UserDeletionService } from '@/modules/account';
import { StoreAutoCreateHandler, StorePublicInvalidationHandler } from '@/modules/local-business';
import { StorePublicService } from '@/modules/local-business/services/store-public.service';
import { StoreSitemapService } from '@/modules/local-business/services/store-sitemap.service';
import { FeeSchedulerService } from '@/modules/membership-fee/services/fee-scheduler.service';
import { StoreProcessor } from '@/worker/processors/store.processor';
import { publicSeoFixture } from './public-seo-fixture';

describe('REQ-627 B15 actual outbox public cache invalidation', () => {
  const f = publicSeoFixture();
  afterEach(() => vi.restoreAllMocks());
  async function cached() {
    expect((await f.t.call(`/public/stores/${f.slug}`)).status).toBe(200);
    const items = (await f.t.app.get(StoreSitemapService).page()).items;
    expect(items.some((s) => s.slug === f.slug)).toBe(true);
    expect(await f.t.redis.client.exists(`store-public:${f.slug}`)).toBe(1);
  }
  async function deliver() {
    // Claim only the fixture's real persisted events; never dispatch older tests' outbox.
    // Leasing, marking, payload parsing and the production processor/handler are real.
    const ids = (
      await f.t.prisma.db.outboxEvent.findMany({
        where: {
          type: { in: ['membership_fee.changed', 'user.locked', 'user.deleted'] },
          payload: { path: ['userId'], equals: f.ownerId },
          dispatchedAt: null,
        },
        select: { id: true },
      })
    ).map((r) => r.id);
    expect(ids.length).toBeGreaterThan(0);
    const repo = new OutboxRepository(f.t.prisma);
    vi.spyOn(repo, 'claim').mockImplementation((types, limit, lease) =>
      f.t.prisma.db.$queryRaw(Prisma.sql`
      UPDATE outbox_events SET locked_until=now()+${lease}*interval '1 second'
      WHERE id IN (SELECT id FROM outbox_events WHERE id=ANY(${ids}::bigint[])
        AND type=ANY(${types}::text[]) AND dispatched_at IS NULL
        AND (locked_until IS NULL OR locked_until<now()) ORDER BY id LIMIT ${limit}
        FOR UPDATE SKIP LOCKED) RETURNING id,type,payload,attempts`),
    );
    const relay = new OutboxRelayService(repo);
    new StoreProcessor(
      relay,
      f.t.app.get(StoreAutoCreateHandler),
      f.t.app.get(StorePublicInvalidationHandler),
    ).onApplicationBootstrap();
    expect(await relay.relayOnce()).toBe(ids.length);
    expect(await relay.relayOnce()).toBe(0);
    await f.t.app.get(StorePublicInvalidationHandler).batch([f.ownerId]); // repeat is harmless
    expect(await f.t.redis.client.exists(`store-public:${f.slug}`)).toBe(0);
    expect((await f.t.call(`/public/stores/${f.slug}`)).status).toBe(404);
    expect(
      (await f.t.app.get(StoreSitemapService).page()).items.some((s) => s.slug === f.slug),
    ).toBe(false);
    expect(
      await f.t.prisma.db.outboxEvent.count({
        where: { id: { in: ids }, dispatchedAt: { not: null } },
      }),
    ).toBe(ids.length);
  }
  it('REQ-627 feeStatus08:00 expires fee and emits same-transaction changed event; no TTL wait', async () => {
    await cached();
    const now = new Date();
    await f.t.prisma.db.membershipFee.update({
      where: { userId: f.ownerId },
      data: { validUntil: new Date(now.getTime() - 1000) },
    });
    await f.t.app.get(FeeSchedulerService).sweep(now);
    expect(
      await f.t.prisma.db.membershipFee.findUniqueOrThrow({
        where: { userId: f.ownerId },
        select: { status: true },
      }),
    ).toEqual({ status: 'expired' });
    await deliver();
  });
  it('REQ-627 locked account event clears cached public page and sitemap', async () => {
    await cached();
    await f.t.prisma.db.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: f.ownerId, status: 'active' },
        data: { status: 'locked' },
      });
      await f.t.app.get(OutboxService).add(tx, 'user.locked', { userId: f.ownerId, reason: null });
    });
    await deliver();
  });
  it('REQ-627 approved internal soft-delete is atomic/audited/idempotent and invalidates via relay', async () => {
    await cached();
    const deletion = f.t.app.get(UserDeletionService),
      actor = { id: f.ownerId, ip: null };
    expect(await deletion.softDelete(actor, f.ownerId)).toBe(true);
    expect(await deletion.softDelete(actor, f.ownerId)).toBe(false);
    expect(
      await f.t.prisma.db.auditLog.count({ where: { entityId: f.ownerId, action: 'user.delete' } }),
    ).toBe(1);
    await deliver();
    await deletion.effects(f.ownerId);
    expect((await f.t.call('/me', { token: f.token })).status).toBe(403);
  });
  it('REQ-627 invalidation by owners batches slugs and propagates Redis errors for relay retry', async () => {
    await cached();
    const del = vi.spyOn(f.t.redis.client, 'del').mockRejectedValueOnce(new Error('offline'));
    await expect(f.t.app.get(StorePublicService).invalidateOwner([f.ownerId])).rejects.toThrow(
      'offline',
    );
    del.mockRestore();
    await f.t.app.get(StorePublicService).invalidateOwner([f.ownerId]);
    expect(await f.t.redis.client.exists(`store-public:${f.slug}`)).toBe(0);
  });
});
