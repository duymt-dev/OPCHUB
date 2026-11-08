import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { storeSitemapPageSchema } from '@opchub/shared/api-domains';
import { StorePublicService } from '@/modules/local-business/services/store-public.service';
import { publicSeoFixture } from './public-seo-fixture';

describe('REQ-627 B15 sitemap eligibility and keyset', () => {
  const f = publicSeoFixture();
  const page = async (cursor?: string) => {
    const r = await f.t.call(
      `/public/stores-sitemap${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    expect(r.status).toBe(200);
    return storeSitemapPageSchema.parse(await r.json());
  };
  it('REQ-627 excludes noindex, expired, hidden and locked; invalid query400', async () => {
    expect((await page()).items.some((s) => s.slug === f.slug)).toBe(true);
    await f.t.prisma.db.store.update({ where: { id: f.storeId }, data: { seoIndex: false } });
    await f.t.app.get(StorePublicService).invalidate(f.slug);
    expect((await page()).items.some((s) => s.slug === f.slug)).toBe(false);
    const bad = await f.t.call('/public/stores-sitemap?cursor=eyJ4IjoxfQ');
    expect(bad.status).toBe(400);
    const error = (await bad.json()) as { error: { code: string; fields: unknown[] } };
    expect(error.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(error.error.fields)).toBe(true);
    expect(error.error.fields.length).toBeGreaterThan(0);
    expect((await f.t.call('/public/stores-sitemap?q=hidden')).status).toBe(400);
  });
  it.each(['expired', 'hidden', 'locked'] as const)(
    'REQ-627 excludes %s public eligibility',
    async (state) => {
      if (state === 'expired')
        await f.t.prisma.db.membershipFee.update({
          where: { userId: f.ownerId },
          data: { status: 'expired' },
        });
      if (state === 'hidden')
        await f.t.prisma.db.store.update({
          where: { id: f.storeId },
          data: { status: 'hidden', hiddenPrev: 'published' },
        });
      if (state === 'locked')
        await f.t.prisma.db.user.update({ where: { id: f.ownerId }, data: { status: 'locked' } });
      await f.t.app.get(StorePublicService).invalidate(f.slug);
      expect((await page()).items.some((s) => s.slug === f.slug)).toBe(false);
    },
  );
  it('REQ-627 1001 tied rows span two pages without duplicates, preserve microsecond cursor', async () => {
    const prefix = `820-${randomUUID()}`,
      ids = Array.from({ length: 1001 }, (_, i) => `${prefix}-${i}`);
    f.users.push(...ids);
    await f.t.prisma.db.user.createMany({
      data: ids.map((id) => ({
        id,
        memberCode: id,
        fullName: 'Sitemap fixture',
        email: `${id}@example.test`,
        accountType: 'business' as const,
      })),
    });
    await f.t.prisma.db.membershipFee.createMany({
      data: ids.map((userId) => ({
        userId,
        status: 'active' as const,
        amount: 1,
        validUntil: new Date(Date.now() + 86_400_000),
      })),
    });
    const date = new Date(Date.now() + 60_000);
    await f.t.prisma.db.store.createMany({
      data: ids.map((id) => ({
        id,
        ownerId: id,
        slug: `seo-${id}`,
        name: 'Sitemap fixture',
        status: 'published' as const,
        updatedAt: date,
      })),
    });
    await f.t.app.get(StorePublicService).invalidate(f.slug);
    const a = await page();
    expect(a.items).toHaveLength(1000);
    expect(a.nextCursor).not.toBeNull();
    const b = await page(a.nextCursor!);
    const own = [...a.items, ...b.items].filter((s) => s.slug.startsWith(`seo-${prefix}`));
    expect(own).toHaveLength(1001);
    expect(new Set(own.map((s) => s.slug)).size).toBe(1001);
    const raw = JSON.parse(Buffer.from(a.nextCursor!, 'base64url').toString()) as { at: string };
    expect(raw.at).toMatch(/\.\d{6}Z$/);
  });
});
