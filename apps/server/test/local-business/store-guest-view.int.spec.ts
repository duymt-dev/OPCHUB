import { describe, it, expect, vi, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { storeDashboardSchema } from '@opchub/shared/api-domains';
import { StoreGuestViewService } from '@/modules/local-business/services/store-guest-view.service';
import { publicSeoFixture } from './public-seo-fixture';

describe('REQ-627 B15 independent public guest views', () => {
  const f = publicSeoFixture();
  afterEach(() => vi.restoreAllMocks());
  const count = async () =>
    (
      await f.t.prisma.db.storeDailyGuestView.aggregate({
        where: { storeId: f.storeId },
        _sum: { views: true },
      })
    )._sum.views ?? 0;
  const view = (ua: string, token?: string, json: unknown = {}) =>
    f.t.call(`/public/stores/${f.slug}/view`, {
      method: 'POST',
      json,
      ...(token ? { token } : {}),
      headers: { 'user-agent': ua },
    });
  it('REQ-627 three visits in ten minutes count once; VN day and KPI remain independent', async () => {
    const service = f.t.app.get(StoreGuestViewService),
      ua = `Mozilla/5.0 ${randomUUID()}`;
    const before = await f.t.prisma.db.store.findUniqueOrThrow({
      where: { id: f.storeId },
      select: { viewCount: true },
    });
    for (const minute of [0, 5, 10])
      await service.record(
        f.slug,
        '192.0.2.1',
        ua,
        undefined,
        new Date(Date.UTC(2026, 10, 8, 17, minute)),
      );
    expect(await count()).toBe(1);
    const row = await f.t.prisma.db.storeDailyGuestView.findFirstOrThrow({
      where: { storeId: f.storeId },
    });
    expect(row.day.toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(
      await f.t.prisma.db.store.findUniqueOrThrow({
        where: { id: f.storeId },
        select: { viewCount: true },
      }),
    ).toEqual(before);
    expect(await f.t.prisma.db.storeDailyView.count({ where: { storeId: f.storeId } })).toBe(0);
  });
  it('REQ-627 bots/empty UA and authenticated owner never count; anonymous returns204', async () => {
    for (const ua of [
      'Googlebot',
      'bingbot',
      'facebookexternalhit',
      'zalo',
      'crawler',
      'HeadlessChrome',
      '',
    ]) {
      expect((await view(ua)).status).toBe(204);
    }
    expect((await view(`Mozilla ${randomUUID()}`, f.token)).status).toBe(204);
    expect(await count()).toBe(0);
    expect((await view(`Mozilla ${randomUUID()}`)).status).toBe(204);
    expect(await count()).toBe(1);
    const response = await f.t.call('/me/store/dashboard', { token: f.token });
    const dashboard = storeDashboardSchema.parse(await response.json());
    expect(dashboard.guestViews7d).toBe(1);
    expect(dashboard.views7).toBe(0);
  });
  it('REQ-627 hidden/unknown stores204; invalid body400 fields; oversized413', async () => {
    const bad = await view('Mozilla', undefined, { ip: 'forged' });
    expect(bad.status).toBe(400);
    const error = (await bad.json()) as { error: { code: string; fields: unknown[] } };
    expect(error.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(error.error.fields)).toBe(true);
    expect(error.error.fields.length).toBeGreaterThan(0);
    expect((await view('Mozilla', undefined, { x: 'x'.repeat(800_000) })).status).toBe(413);
    await f.t.prisma.db.store.update({
      where: { id: f.storeId },
      data: { status: 'hidden', hiddenPrev: 'published' },
    });
    expect((await view('Mozilla')).status).toBe(204);
    expect(
      (
        await f.t.call('/public/stores/unknown-820/view', {
          method: 'POST',
          json: {},
          headers: { 'user-agent': 'Mozilla' },
        })
      ).status,
    ).toBe(204);
    expect(await count()).toBe(0);
  });
  it('REQ-627 Redis failure fails closed; no raw IP/UA in dedup keys; endpoint rate limit30', async () => {
    const service = f.t.app.get(StoreGuestViewService);
    const set = vi.spyOn(f.t.redis.client, 'set').mockRejectedValueOnce(new Error('offline'));
    await service.record(f.slug, '192.0.2.20', 'Mozilla isolated-820');
    expect(await count()).toBe(0);
    set.mockRestore();
    await service.record(f.slug, '192.0.2.20', `Mozilla ${randomUUID()}`);
    const keys = await f.t.redis.client.keys('opchub:store-guest-view:*');
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((k) => /^opchub:store-guest-view:[a-f0-9]{64}$/.test(k))).toBe(true);
    for (let i = 0; i < 30; i++) expect((await view('Googlebot')).status).toBe(204);
    expect((await view('Googlebot')).status).toBe(429);
  });
});
