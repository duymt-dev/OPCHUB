import type { Prisma } from '@opchub/db';
import { EMPTY_STORE_BUILDER, needMatchesSchema } from '@opchub/shared/api-domains';
import { STORE_FIELDS } from '@opchub/shared/fixtures';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { NeedMatchNotifyHandler } from '@/modules/local-business';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NeedMatchRepository } from '@/modules/local-business/repositories/need-match.query';
import { NeedMatchService } from '@/modules/local-business/services/need-match.service';
import { AuthStateService } from '@/common/auth';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-626 BR-478–480 real need matches', () => {
  let t: TestApp;
  let owner: string;
  let provider: string;
  let ownStore: string;
  let otherStore: string;
  let token: string;
  let providerToken: string;
  const users: string[] = [];
  const field = 'V46809 isolated food';
  const province = 'V46809 province';
  const clear = () => t.redis.client.del(`need-matches:${owner}`);
  beforeAll(async () => {
    t = await createTestApp();
    const me = await createUser(t, { accountType: 'business', fee: 'active' });
    const supplier = await createUser(t, { accountType: 'business', fee: 'active' });
    owner = me.id;
    provider = supplier.id;
    users.push(owner, provider);
    token = await tokenOf(t, me);
    providerToken = await tokenOf(t, supplier);
    ownStore = (
      await t.prisma.db.store.create({
        data: {
          ownerId: owner,
          name: '809 own',
          field,
          province,
          status: 'published',
          intro: 'Robusta organic arabica',
          items: { create: { kind: 'product', name: 'Robusta', sort: 0 } },
        },
      })
    ).id;
    otherStore = (
      await t.prisma.db.store.create({
        data: {
          ownerId: provider,
          name: '809 supplier',
          field,
          province,
          status: 'published',
        },
      })
    ).id;
  });
  beforeEach(async () => {
    await flushAuthState(t);
    await clear();
    await t.prisma.db.need.deleteMany({ where: { ownerId: { in: [owner, provider] } } });
    await t.prisma.db.store.updateMany({
      where: { id: { in: [ownStore, otherStore] } },
      data: { status: 'published', hiddenPrev: null, field, province },
    });
    await t.prisma.db.membershipFee.updateMany({
      where: { userId: { in: [owner, provider] } },
      data: { status: 'active', validUntil: new Date(Date.now() + 86_400_000) },
    });
    await t.prisma.db.user.update({ where: { id: provider }, data: { deletedAt: null } });
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await clear();
    await t.prisma.db.user.deleteMany({ where: { id: { in: users } } });
    await t.close();
  });
  const need = (data: Partial<Prisma.NeedUncheckedCreateInput> = {}) =>
    t.prisma.db.need.create({
      data: {
        ownerId: provider,
        storeId: otherStore,
        type: 'buy',
        title: 'Robusta organic arabica',
        description: 'Private description',
        phone: '0912345678',
        field,
        province,
        ...data,
      },
    });
  const get = async (auth = token) => {
    const r = await t.call('/me/needs/matches', { token: auth });
    expect(r.status).toBe(200);
    return needMatchesSchema.parse(await r.json());
  };
  it('top3: raw score, recency, id tie-break and safe projection', async () => {
    const rows = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        need({
          title: i === 0 ? 'No keywords' : 'Robusta organic arabica',
          updatedAt: new Date(`2026-11-0${i + 1}T00:00:00Z`),
        }),
      ),
    );
    const got = await get();
    expect(got.rows.map((row) => row.id)).toEqual([rows[5]?.id, rows[4]?.id, rows[3]?.id]);
    expect(got.rows[0]).toMatchObject({ pct: 98, reasons: ['field', 'province', 'product'] });
    expect(got.rows[0]).not.toHaveProperty('description');
    expect(got.rows[0]).not.toHaveProperty('phone');
    expect(got.rows[0]).not.toHaveProperty('budgetMin');
  });
  it('visibility: own need, closed/hidden need, hidden/draft supplier, expired/deleted owner excluded', async () => {
    const row = await need();
    await need({ ownerId: owner, storeId: ownStore });
    expect((await get()).rows.map((r) => r.id)).toEqual([row.id]);
    for (const status of ['closed', 'hidden'] as const) {
      await t.prisma.db.need.update({
        where: { id: row.id },
        data: { status, hiddenPrev: status === 'hidden' ? 'closed' : null },
      });
      await clear();
      expect((await get()).rows).toEqual([]);
    }
    await t.prisma.db.need.update({
      where: { id: row.id },
      data: { status: 'open', hiddenPrev: null },
    });
    for (const status of ['hidden', 'draft'] as const) {
      await t.prisma.db.store.update({
        where: { id: otherStore },
        data: { status, hiddenPrev: status === 'hidden' ? 'published' : null },
      });
      await clear();
      expect((await get()).rows).toEqual([]);
    }
    await t.prisma.db.store.update({
      where: { id: otherStore },
      data: { status: 'published', hiddenPrev: null },
    });
    await t.prisma.db.membershipFee.update({
      where: { userId: provider },
      data: { status: 'expired' },
    });
    await clear();
    expect((await get()).rows).toEqual([]);
    await t.prisma.db.membershipFee.update({
      where: { userId: provider },
      data: { status: 'active' },
    });
    await t.prisma.db.user.update({ where: { id: provider }, data: { deletedAt: new Date() } });
    await clear();
    expect((await get()).rows).toEqual([]);
  });
  it('own store status: draft still matches, hidden yields empty card; no field/province skips candidates', async () => {
    await need();
    await t.prisma.db.store.update({ where: { id: ownStore }, data: { status: 'draft' } });
    expect((await get()).rows).toHaveLength(1);
    await t.prisma.db.store.update({
      where: { id: ownStore },
      data: { status: 'hidden', hiddenPrev: 'draft' },
    });
    await clear();
    expect(await get()).toMatchObject({ hasStore: true, rows: [] });
    await t.prisma.db.store.update({
      where: { id: ownStore },
      data: { status: 'draft', hiddenPrev: null, field: '', province: '' },
    });
    await clear();
    const spy = vi.spyOn(t.app.get(NeedMatchRepository), 'candidates');
    expect(await get()).toEqual({ hasStore: true, storeField: null, rows: [] });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it('no store: personal and business without store return false', async () => {
    for (const accountType of ['personal', 'business'] as const) {
      const u = await createUser(t, { accountType, fee: 'active' });
      users.push(u.id);
      expect(await get(await tokenOf(t, u))).toEqual({
        hasStore: false,
        storeField: null,
        rows: [],
      });
    }
  });
  it('province30 qualifies, product-only does not, custom field does not grant50', async () => {
    const provinceOnly = await need({ field: 'Other', title: 'No words' });
    await need({ field: 'Other', province: 'Other' });
    await need({ fieldCustom: true, province: 'Other' });
    expect((await get()).rows).toEqual([
      expect.objectContaining({ id: provinceOnly.id, pct: 30, reasons: ['province'] }),
    ]);
  });
  it('cache: second call within60s performs no repository SQL; exact key/TTL', async () => {
    await need();
    const repo = t.app.get(NeedMatchRepository);
    const first = vi.spyOn(repo, 'store');
    const second = vi.spyOn(repo, 'candidates');
    const result = await get();
    expect(await get()).toEqual(result);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    const ttl = await t.redis.client.ttl(`need-matches:${owner}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
    first.mockRestore();
    second.mockRestore();
  });
  it('Redis failure calculates directly, including corrupt cached data fallback', async () => {
    await need();
    const read = vi
      .spyOn(t.redis.client, 'get')
      .mockRejectedValueOnce(new Error('cache unavailable'));
    const write = vi
      .spyOn(t.redis.client, 'set')
      .mockRejectedValueOnce(new Error('cache unavailable'));
    expect(
      (await t.app.get(NeedMatchService).matches({ id: owner, accountType: 'business' })).rows,
    ).toHaveLength(1);
    read.mockRestore();
    write.mockRestore();
    await t.redis.client.set(`need-matches:${owner}`, 'invalid json');
    expect((await get()).rows).toHaveLength(1);
  });
  it('access: investor403, expired402 canonical standard, locked403, unauthenticated401', async () => {
    for (const spec of [
      { accountType: 'investor' as const, fee: 'active' as const, code: 403 },
      { fee: 'expired' as const, code: 402 },
    ]) {
      const u = await createUser(t, spec);
      users.push(u.id);
      expect((await t.call('/me/needs/matches', { token: await tokenOf(t, u) })).status).toBe(
        spec.code,
      );
    }
    const locked = await createUser(t, { fee: 'active' });
    users.push(locked.id);
    const lockedToken = await tokenOf(t, locked);
    await t.prisma.db.user.update({ where: { id: locked.id }, data: { status: 'locked' } });
    await t.app.get(AuthStateService).setLocked(locked.id, true);
    expect((await t.call('/me/needs/matches', { token: lockedToken })).status).toBe(403);
    expect((await t.call('/me/needs/matches')).status).toBe(401);
  });

  it('same field and province need survives candidate cap', async () => {
    const old = await need({ updatedAt: new Date('2020-01-01T00:00:00Z') });
    await t.prisma.db.need.createMany({
      data: Array.from({ length: 250 }, (_, i) => ({
        ownerId: provider,
        storeId: otherStore,
        type: 'buy' as const,
        title: `Province-only ${i}`,
        description: '',
        phone: '0912345678',
        field: 'Other field',
        province,
        updatedAt: new Date(),
      })),
    });
    const result = await get();
    expect(result.rows[0]?.id).toBe(old.id);
    expect(result.rows[0]?.pct).toBe(98);
  });

  it('invalidates on close delete and store edit', async () => {
    const auth = providerToken;
    const row = await need();
    expect((await get()).rows.map((r) => r.id)).toContain(row.id);
    const changed = await t.call(`/me/needs/${row.id}`, {
      token: auth,
      method: 'PATCH',
      json: { action: 'close' },
    });
    expect(changed.status).toBe(200);
    const deliver = async (needId: string) => {
      const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
        where: {
          type: 'need.unpublished',
          payload: { path: ['needId'], equals: needId },
        },
        orderBy: { id: 'desc' },
      });
      const payload = parseOutboxPayload('need.unpublished', event.payload);
      await t.app.get(NeedMatchNotifyHandler).unpublished(payload);
      await t.app.get(NeedMatchNotifyHandler).unpublished(payload); // replay safe
    };
    await deliver(row.id);
    expect((await get()).rows).toEqual([]);
    const removed = await need();
    await clear();
    expect((await get()).rows.map((r) => r.id)).toContain(removed.id);
    expect(
      (await t.call(`/me/needs/${removed.id}`, { token: auth, method: 'DELETE' })).status,
    ).toBe(204);
    await deliver(removed.id); // snapshot still addresses recipients after hard deletion
    expect((await get()).rows).toEqual([]);
    await t.prisma.db.store.update({ where: { id: ownStore }, data: { status: 'draft' } });
    const save = await t.call('/me/store', {
      method: 'PUT',
      token,
      json: {
        ...EMPTY_STORE_BUILDER,
        name: '818 draft',
        slogan: '',
        field: STORE_FIELDS[0],
        province: '',
        intro: '',
        phone: '',
        email: '',
        website: '',
        address: '',
        audience: 'organization',
        coverUrl: null,
        items: [],
      },
    });
    expect(save.status).toBe(200);
    expect(await t.redis.client.get(`need-matches:${owner}`)).toBeNull();
    expect((await get()).storeField).toBe(STORE_FIELDS[0]);
  });

  it('cache invalidation uses one deduplicated DEL and tolerates Redis failure', async () => {
    const service = t.app.get(NeedMatchService);
    const del = vi.spyOn(t.redis.client, 'del');
    await service.invalidate([owner, owner, provider]);
    expect(del).toHaveBeenCalledExactlyOnceWith(
      `need-matches:${owner}`,
      `need-matches:${provider}`,
    );
    del.mockRejectedValueOnce(new Error('offline'));
    await expect(service.invalidate([owner])).resolves.toBeUndefined();
    del.mockRestore();
  });
});
