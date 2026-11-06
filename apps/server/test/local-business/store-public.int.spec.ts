import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_STORE_BUILDER,
  STORE_STOCK_COVERS,
  storePublicConfigSchema,
  storePublicPageSchema,
} from '@opchub/shared/api-domains';
import { StoreRepository } from '@/modules/local-business/repositories/store.repository';
import { StorePublicRepository } from '@/modules/local-business/repositories/store-public.repository';
import { StorePublicService } from '@/modules/local-business/services/store-public.service';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-627 BR-494 real public store', () => {
  let t: TestApp;
  let owner: string;
  let token: string;
  let store: string;
  const slug = `public-810-${randomUUID()}`;
  const users: string[] = [];
  const clear = () => t.redis.client.del(`store-public:${slug}`);
  beforeAll(async () => {
    t = await createTestApp();
    const u = await createUser(t, { accountType: 'business', fee: 'active' });
    owner = u.id;
    users.push(owner);
    token = await tokenOf(t, u);
    store = (
      await t.prisma.db.store.create({
        data: {
          ownerId: owner,
          slug,
          name: 'Cà phê Ngon',
          status: 'published',
          slogan: 'Slogan',
          field: 'Nông nghiệp',
          province: 'Hà Nội',
          intro: 'Business introduction',
          phone: '0912345678',
          email: 'business@example.test',
          team: [
            {
              name: 'Expert',
              role: 'Engineer',
              photoUrl: null,
              email: 'private@example.test',
              phone: 'private',
              desc: 'private',
            },
          ],
          docs: [{ name: 'Private', url: 'https://example.test/private.pdf' }],
          items: { create: { kind: 'product', name: 'Coffee', sort: 0, price: 10000 } },
        },
        select: { id: true },
      })
    ).id;
  });
  beforeEach(async () => {
    vi.restoreAllMocks();
    await flushAuthState(t);
    await clear();
    await t.prisma.db.store.update({
      where: { id: store },
      data: { status: 'published', hiddenPrev: null, seoIndex: true, seoTitle: '', seoDesc: '' },
    });
    await t.prisma.db.user.update({ where: { id: owner }, data: { deletedAt: null } });
    await t.prisma.db.membershipFee.update({
      where: { userId: owner },
      data: { status: 'active', validUntil: new Date(Date.now() + 86_400_000) },
    });
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await clear();
    await t.prisma.db.user.deleteMany({ where: { id: { in: users } } });
    await t.close();
  });
  const guest = () => t.call(`/public/stores/${slug}`);
  const patch = (json: unknown, auth = token) =>
    t.call('/me/store/public', { method: 'PATCH', token: auth, json });

  it('public dto: anonymous whitelist, business contacts only, stable item projection', async () => {
    await t.app.get(StorePublicService).page(slug);
    const response = await guest();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    const raw: unknown = await response.json();
    const data = storePublicPageSchema.parse(raw);
    for (const key of [
      'ownerId',
      'ownerName',
      'status',
      'docs',
      'viewCount',
      'hiddenCovers',
      'logos',
      'covers',
      'fav',
      'isMine',
      'openNeeds',
      'id',
    ])
      expect(raw).not.toHaveProperty(key);
    expect(Object.keys(raw as Record<string, unknown>).sort()).toEqual(
      Object.keys(storePublicPageSchema.shape).sort(),
    );
    expect(data.team).toEqual([{ name: 'Expert', role: 'Engineer', photoUrl: null }]);
    expect(data.email).toBe('business@example.test');
    expect(data.items).toEqual([
      { name: 'Coffee', kind: 'product', description: '', imageUrl: null, price: 10000 },
    ]);
    expect(JSON.stringify(raw)).not.toContain('private');
  });
  it('seo index / TC-494: patch invalidates Redis, guest stays public, defaults return when cleared', async () => {
    await guest();
    const response = await patch({
      seoIndex: false,
      title: 'Google title',
      desc: 'Google description',
    });
    expect(response.status).toBe(200);
    expect(storePublicConfigSchema.parse(await response.json())).toMatchObject({
      seoIndex: false,
      title: 'Google title',
    });
    expect(await t.redis.client.get(`store-public:${slug}`)).toBeNull();
    expect(storePublicPageSchema.parse(await (await guest()).json()).seo).toEqual({
      index: false,
      title: 'Google title',
      desc: 'Google description',
    });
    expect((await patch({ title: '', desc: '', seoIndex: true })).status).toBe(200);
    expect(storePublicPageSchema.parse(await (await guest()).json()).seo).toEqual({
      index: true,
      title: 'Cà phê Ngon – Nông nghiệp tại Hà Nội',
      desc: 'Slogan',
    });
  });
  it('seo fields: strict invalid body returns 400 with fields, oversized body 413', async () => {
    for (const input of [
      {},
      { title: 'x'.repeat(71) },
      { desc: 'x'.repeat(161) },
      { ownerId: owner },
    ]) {
      const r = await patch(input);
      expect(r.status).toBe(400);
      const error = z
        .object({
          error: z.object({ code: z.literal('VALIDATION_ERROR'), fields: z.array(z.unknown()) }),
        })
        .parse(await r.json());
      expect(error.error.fields.length).toBeGreaterThan(0);
    }
    expect((await patch({ desc: 'x'.repeat(800_000) })).status).toBe(413);
  });
  it('visibility: draft, hidden, expired/deleted owner, unknown and malformed slug are 404', async () => {
    for (const status of ['draft', 'hidden'] as const) {
      await t.prisma.db.store.update({
        where: { id: store },
        data: { status, hiddenPrev: status === 'hidden' ? 'published' : null },
      });
      expect((await guest()).status).toBe(404);
    }
    await t.prisma.db.store.update({
      where: { id: store },
      data: { status: 'published', hiddenPrev: null },
    });
    await t.prisma.db.membershipFee.update({
      where: { userId: owner },
      data: { status: 'expired' },
    });
    expect((await guest()).status).toBe(404);
    await t.prisma.db.membershipFee.update({
      where: { userId: owner },
      data: { status: 'active' },
    });
    await t.prisma.db.user.update({ where: { id: owner }, data: { deletedAt: new Date() } });
    expect((await guest()).status).toBe(404);
    for (const invalid of ['does-not-exist', 'INVALID', '-a', 'a--b', 'x'.repeat(65)])
      expect((await t.call(`/public/stores/${invalid}`)).status).toBe(404);
  });
  it('no view count: three guest requests never increment stored KPIs', async () => {
    const before = await t.prisma.db.store.findUniqueOrThrow({
      where: { id: store },
      select: { viewCount: true },
    });
    const days = await t.prisma.db.storeDailyView.findMany({ where: { storeId: store } });
    for (let i = 0; i < 3; i += 1) expect((await guest()).status).toBe(200);
    expect(
      await t.prisma.db.store.findUnique({ where: { id: store }, select: { viewCount: true } }),
    ).toEqual(before);
    expect(await t.prisma.db.storeDailyView.findMany({ where: { storeId: store } })).toEqual(days);
  });
  it('access: unauthenticated401, personal403, missing own store404, hidden PATCH409', async () => {
    expect((await t.call('/me/store/public')).status).toBe(401);
    for (const accountType of ['personal', 'business'] as const) {
      const u = await createUser(t, { accountType, fee: 'active' });
      users.push(u.id);
      const auth = await tokenOf(t, u);
      expect((await t.call('/me/store/public', { token: auth })).status).toBe(
        accountType === 'personal' ? 403 : 404,
      );
      expect((await patch({ seoIndex: false }, auth)).status).toBe(
        accountType === 'personal' ? 403 : 404,
      );
    }
    await t.prisma.db.store.update({
      where: { id: store },
      data: { status: 'hidden', hiddenPrev: 'published' },
    });
    expect((await patch({ seoIndex: false })).status).toBe(409);
  });
  it('cache: second request skips repository, 60s TTL, corrupt/unavailable cache falls back', async () => {
    const spy = vi.spyOn(t.app.get(StorePublicRepository), 'page');
    await guest();
    await guest();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await t.redis.client.ttl(`store-public:${slug}`)).toBeGreaterThan(0);
    expect(await t.redis.client.ttl(`store-public:${slug}`)).toBeLessThanOrEqual(60);
    await t.redis.client.set(`store-public:${slug}`, '{broken');
    await guest();
    expect(spy).toHaveBeenCalledTimes(2);
    const get = vi.spyOn(t.redis.client, 'get').mockRejectedValueOnce(new Error('offline'));
    expect(await t.app.get(StorePublicService).page(slug)).toMatchObject({ slug });
    get.mockRestore();
    expect(spy).toHaveBeenCalledTimes(3);
  });
  it('slug: duplicate concurrent creation, idempotency, rename stability', async () => {
    const repo = t.app.get(StoreRepository);
    const name = `Cà phê Ngon ${randomUUID()}`;
    const people = await Promise.all(
      [0, 1].map(async () => {
        const u = await createUser(t, { accountType: 'business', fee: 'active' });
        users.push(u.id);
        return u;
      }),
    );
    const inputs = people.map((u) => ({
      ownerId: u.id,
      name,
      province: '',
      phone: '',
      email: '',
      website: '',
      address: '',
    }));
    await Promise.all(
      inputs.map((input) => t.prisma.db.$transaction((tx) => repo.createDraft(tx, input))),
    );
    const rows = await t.prisma.db.store.findMany({
      where: { ownerId: { in: people.map((u) => u.id) } },
      select: { id: true, slug: true },
    });
    const slugs = rows.map((r) => r.slug).sort();
    expect(slugs[1]).toBe(`${slugs[0]}-2`);
    const input = inputs[0];
    if (!input) throw new Error('Missing fixture');
    expect(await t.prisma.db.$transaction((tx) => repo.createDraft(tx, input))).toBe(false);
    const row = rows[0];
    if (!row) throw new Error('Missing store');
    await t.prisma.db.store.update({ where: { id: row.id }, data: { name: 'Renamed' } });
    expect(
      (await t.prisma.db.store.findUniqueOrThrow({ where: { id: row.id }, select: { slug: true } }))
        .slug,
    ).toBe(row.slug);
  });
  it('rate limit: anonymous 61st call is429', async () => {
    let response = await guest();
    for (let n = 1; n < 61 && response.status === 200; n += 1) response = await guest();
    expect(response.status).toBe(429);
  });
  it('cache invalidation: owner PUT/publish/unpublish and audited Admin hide/show are immediate', async () => {
    expect((await guest()).status).toBe(200);
    const saved = await t.call('/me/store', {
      method: 'PUT',
      token,
      json: {
        ...EMPTY_STORE_BUILDER,
        name: 'Public replacement',
        slogan: 'Changed public slogan',
        audience: 'business',
        field: 'Thủy sản',
        province: 'Cà Mau',
        intro: 'Thu mua và chế biến thủy sản từ ngư dân Sông Đốc, đạt chuẩn chất lượng.',
        coverUrl: STORE_STOCK_COVERS[0],
        phone: '0912345678',
        email: 'business@example.test',
        website: 'public.vn',
        address: 'Sông Đốc, Cà Mau',
        items: [{ kind: 'product', name: 'Coffee', price: null, description: '', imageUrl: null }],
      },
    });
    expect(saved.status).toBe(200);
    expect(storePublicPageSchema.parse(await (await guest()).json()).name).toBe(
      'Public replacement',
    );
    expect((await t.call('/me/store/unpublish', { method: 'POST', token })).status).toBe(200);
    expect((await guest()).status).toBe(404);
    expect((await t.call('/me/store/publish', { method: 'POST', token })).status).toBe(200);
    expect((await guest()).status).toBe(200);
    const admin = await createUser(t, { systemRole: 'admin' });
    users.push(admin.id);
    const adminToken = await tokenOf(t, admin);
    expect(
      (
        await t.call('/admin/stores/hide', {
          method: 'POST',
          token: adminToken,
          json: { ids: [store], reason: '810 cache visibility test' },
        })
      ).status,
    ).toBe(200);
    expect((await guest()).status).toBe(404);
    expect(
      await t.prisma.db.auditLog.count({ where: { action: 'store.hide', entityId: store } }),
    ).toBe(1);
    expect(
      (
        await t.call('/admin/stores/show', {
          method: 'POST',
          token: adminToken,
          json: { ids: [store] },
        })
      ).status,
    ).toBe(200);
    expect((await guest()).status).toBe(200);
  });
});
