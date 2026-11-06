import { Prisma } from '@opchub/db';
import { AuthStateService } from '@/common/auth';
import { globalSearchResultSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { visibleStore } from '@/modules/local-business/repositories/store-explore.repository';
import { visibleNeed } from '@/modules/local-business/repositories/need-explore.repository';
import {
  visibleNeedSql,
  visibleStoreSql,
} from '@/modules/local-business/repositories/search-visibility.query';
import { assignMemberCode, createUser, flushAuthState } from '../factories/user.factory';
import { addMember, createGroup, tokenOf } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('TIP-V46-808 global search real HTTP + visibility equivalence', () => {
  let t: TestApp;
  let viewer: string;
  let admin: string;
  let owner: string;
  let storeId: string;
  let needId: string;
  let groupId: string;
  const userIds: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    const business = await createUser(t, { accountType: 'business', fee: 'active' });
    owner = business.id;
    const user = await createUser(t, { fee: 'active' });
    userIds.push(owner, user.id);
    viewer = await tokenOf(t, user);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
    const store = await t.prisma.db.store.create({
      data: {
        ownerId: owner,
        name: 'Zqx cà phê',
        field: 'Chế biến',
        province: 'Đắk Lắk',
        status: 'published',
      },
    });
    storeId = store.id;
    needId = (
      await t.prisma.db.need.create({
        data: {
          ownerId: owner,
          storeId,
          type: 'buy',
          title: 'Zqx cà phê nguyên chất',
          description: '',
          phone: '0912345678',
          field: 'Chế biến',
          province: 'Đắk Lắk',
        },
      })
    ).id;
    const group = await createGroup(t, { name: 'Zqx cộng đồng' });
    groupId = group.id;
    await addMember(t, groupId, user.id);
  });
  afterAll(async () => {
    await t.prisma.db.project.deleteMany({ where: { ownerId: { in: userIds } } });
    await t.prisma.db.group.deleteMany({ where: { id: groupId } });
    await t.prisma.db.user.deleteMany({ where: { id: { in: userIds } } });
    await t.close();
  });
  const get = async (q: string, token = viewer, path = '/search') => {
    const r = await t.call(`${path}?q=${encodeURIComponent(q)}`, { token });
    expect(r.status).toBe(200);
    return globalSearchResultSchema.parse(await r.json());
  };
  it('returns fixed groups, accents equivalently, joined flag and no Portal members', async () => {
    const result = await get('zqx');
    expect(result.groups.map((g) => g.kind)).toEqual(['store', 'need', 'group']);
    expect(result.groups.find((g) => g.kind === 'group')?.items[0]).toMatchObject({
      id: groupId,
      joined: true,
    });
    expect(await get('zqx ca phe')).toEqual(await get('Zqx cà phê'));
    expect(await get('Zq')).toEqual(await get('zqx'));
    expect(result.groups.every((g) => g.items.length <= 4)).toBe(true);
  });
  it.each(['%_', '\\%', "' OR 1=1 --", 'unmatched-zzqqxx'])(
    'treats %s as literal and returns empty',
    async (q) => {
      expect((await get(q)).groups).toEqual([]);
    },
  );
  it('validates boundary, denies missing session and respects investor group exclusion', async () => {
    expect((await t.call('/search?q=zqx')).status).toBe(401);
    for (const q of ['a', ' ', 'a'.repeat(101)]) {
      expect((await t.call(`/search?q=${encodeURIComponent(q)}`, { token: viewer })).status).toBe(
        400,
      );
    }
    const investor = await createUser(t, { accountType: 'investor', fee: null });
    userIds.push(investor.id);
    expect((await get('zqx', await tokenOf(t, investor))).groups.map((g) => g.kind)).toEqual([
      'store',
      'need',
    ]);
  });
  it('Admin permissions filter groups and include hidden records with labels', async () => {
    await t.prisma.db.store.update({
      where: { id: storeId },
      data: { status: 'hidden', hiddenPrev: 'published' },
    });
    expect((await get('zqx')).groups.map((g) => g.kind)).toEqual(['group']);
    const all = await get('zqx', admin, '/admin/search');
    expect(all.groups.find((g) => g.kind === 'store')?.items[0]?.sub).toContain('Đã ẩn');
    const limited = await createUser(t, { adminPermissions: ['groups.view'] });
    const token = await tokenOf(t, limited);
    expect((await get('zqx', token, '/admin/search')).groups.map((g) => g.kind)).toEqual(['group']);
    expect((await t.call('/admin/search?q=zqx', { token: viewer })).status).toBe(403);
    await t.prisma.db.store.update({
      where: { id: storeId },
      data: { status: 'published', hiddenPrev: null },
    });
  });
  it('denies expired/locked callers and returns exact member code only on Admin', async () => {
    const user = await createUser(t, { fee: 'active' });
    userIds.push(user.id);
    const code = await assignMemberCode(t, user.id);
    const token = await tokenOf(t, user);
    expect(
      (await get(code, admin, '/admin/search')).groups.find((g) => g.kind === 'member')?.items[0]
        ?.id,
    ).toBe(user.id);
    expect((await get(code)).groups.some((g) => g.kind === 'member')).toBe(false);
    await t.prisma.db.membershipFee.update({
      where: { userId: user.id },
      data: { status: 'expired', validUntil: new Date(0) },
    });
    await flushAuthState(t);
    await t.app
      .get(AuthStateService)
      .setFee(user.id, { status: 'expired', validUntil: new Date(0).toISOString() });
    expect((await t.call('/search?q=zqx', { token })).status).toBe(402);
    await t.prisma.db.user.update({ where: { id: user.id }, data: { status: 'locked' } });
    await flushAuthState(t);
    await t.app.get(AuthStateService).setLocked(user.id, true);
    expect((await t.call('/search?q=zqx', { token })).status).toBe(403);
  });
  it('reuses project visibility for public/private/owner and excludes deleted projects', async () => {
    const p = await t.prisma.db.project.create({
      data: {
        ownerId: owner,
        name: 'Zqx public project',
        summary: 'Coffee',
        status: 'published',
        visibility: 'public',
        publishedAt: new Date(),
      },
    });
    expect((await get('zqx')).groups.find((g) => g.kind === 'project')?.items[0]?.id).toBe(p.id);
    await t.prisma.db.project.update({ where: { id: p.id }, data: { visibility: 'private' } });
    expect((await get('zqx')).groups.some((g) => g.kind === 'project')).toBe(false);
    await t.prisma.db.project.update({ where: { id: p.id }, data: { deletedAt: new Date() } });
    expect(
      (await get('zqx', admin, '/admin/search')).groups.some((g) => g.kind === 'project'),
    ).toBe(false);
  });
  it.each([
    'pending_payment',
    'active',
    'expiring',
    'expired',
    'trial',
    'regional_director',
  ] as const)(
    'approved SQL helpers equal original Prisma filters for fee=%s / all store+need states',
    async (status) => {
      const now = new Date();
      await t.prisma.db.membershipFee.update({
        where: { userId: owner },
        data: {
          status,
          validUntil: status === 'expired' ? new Date(0) : new Date(now.getTime() + 86_400_000),
        },
      });
      for (const storeStatus of ['draft', 'published', 'hidden'] as const) {
        await t.prisma.db.store.update({
          where: { id: storeId },
          data: { status: storeStatus, hiddenPrev: storeStatus === 'hidden' ? 'published' : null },
        });
        const original = await t.prisma.db.store.findMany({
          where: { id: storeId, AND: visibleStore(now) },
          select: { id: true },
        });
        const sql = await t.prisma.db.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT s.id FROM stores s WHERE s.id=${storeId} AND ${visibleStoreSql(now)}`,
        );
        expect(sql).toEqual(original);
        for (const needStatus of ['open', 'closed', 'hidden'] as const) {
          await t.prisma.db.need.update({
            where: { id: needId },
            data: { status: needStatus, hiddenPrev: needStatus === 'hidden' ? 'open' : null },
          });
          const originalNeed = await t.prisma.db.need.findMany({
            where: { id: needId, AND: visibleNeed(now) },
            select: { id: true },
          });
          const sqlNeed = await t.prisma.db.$queryRaw<{ id: string }[]>(
            Prisma.sql`SELECT n.id FROM needs n WHERE n.id=${needId} AND ${visibleNeedSql(now)}`,
          );
          expect(sqlNeed).toEqual(originalNeed);
        }
      }
    },
  );
});
