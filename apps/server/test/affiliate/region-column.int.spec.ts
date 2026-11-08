import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AffiliateAdminService } from '@/modules/affiliate/services/affiliate-admin.service';
import { RegionalProjectionRepository } from '@/modules/reporting';
import { regionalShareFixture } from '../factories/regional-share.factory';
import { createUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
describe('REQ-619 D-128 region column', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  it('A9 twenty affiliate rows use one batched region query', async () => {
    const f = await regionalShareFixture(t, 'central');
    const marker = `A9page${randomUUID()}`;
    const ids = [f.agent.id];
    const south = await t.prisma.db.group.findFirstOrThrow({
      where: { kind: 'province', region: 'south', deletedAt: null },
    });
    const child = await t.prisma.db.group.create({
      data: {
        slug: randomUUID(),
        name: marker,
        kind: 'industry',
        industry: randomUUID(),
        parentId: f.group.id,
        province: south.province,
        region: 'south',
      },
    });
    try {
      await t.prisma.db.user.update({ where: { id: f.agent.id }, data: { fullName: marker } });
      for (let i = 1; i < 20; i++) {
        const user = await createUser(t, { fee: 'active' });
        ids.push(user.id);
      }
      await t.prisma.db.user.updateMany({ where: { id: { in: ids } }, data: { fullName: marker } });
      await t.prisma.db.affiliate.createMany({
        data: ids.slice(1).map((userId) => ({
          userId,
          rate: 20,
          code: `A9${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
        })),
      });
      await t.prisma.db.groupMember.createMany({
        data: ids.slice(1).map((userId, i) => ({
          userId,
          groupId: i % 2 === 0 ? south.id : child.id,
          status: 'member',
        })),
      });
      const spy = vi.spyOn(t.app.get(RegionalProjectionRepository), 'affiliateRegions');
      const raw = vi.spyOn(t.prisma.db, '$queryRaw');
      try {
        const page = await t.app.get(AffiliateAdminService).page({ q: marker, page: 1, size: 20 });
        expect(page.items).toHaveLength(20);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(new Set(spy.mock.calls[0]?.[0])).toEqual(new Set(ids));
        expect(
          raw.mock.calls.filter(
            ([sql]) =>
              typeof sql === 'object' &&
              sql !== null &&
              'sql' in sql &&
              String(sql.sql).includes('FROM unnest('),
          ),
        ).toHaveLength(1);
        for (const row of page.items) {
          const index = ids.indexOf(row.userId);
          expect(index).toBeGreaterThanOrEqual(0);
          expect(row.region?.region).toBe(index === 0 || index % 2 === 0 ? 'central' : 'south');
          expect(row.region?.provinceName).toBe(
            index === 0 || index % 2 === 0 ? f.group.province : south.province,
          );
        }
      } finally {
        spy.mockRestore();
        raw.mockRestore();
      }
    } finally {
      await t.prisma.db.user.deleteMany({ where: { id: { in: ids.slice(1) } } });
      await t.prisma.db.group.delete({ where: { id: child.id } });
    }
  });
  it('single query per page, earliest live group and unticked province', async () => {
    const f = await regionalShareFixture(t, 'central');
    const north = await t.prisma.db.group.findFirstOrThrow({
      where: { kind: 'province', region: 'north' },
    });
    await t.prisma.db.groupMember.create({
      data: {
        userId: f.agent.id,
        groupId: north.id,
        status: 'member',
        createdAt: new Date('2020-01-05'),
      },
    });
    await t.prisma.db.regionalDirectorProvince.deleteMany({ where: { region: 'central' } });
    const projection = t.app.get(RegionalProjectionRepository),
      spy = vi.spyOn(projection, 'affiliateRegions');
    const raw = vi.spyOn(t.prisma.db, '$queryRaw');
    const read = t.app.get(AffiliateAdminService);
    try {
      const page = await read.page({ q: f.agent.email, page: 1, size: 20 });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(
        raw.mock.calls.filter(
          ([sql]) =>
            typeof sql === 'object' &&
            sql !== null &&
            'sql' in sql &&
            String(sql.sql).includes('FROM unnest('),
        ),
      ).toHaveLength(1);
      expect(page.items.find((r) => r.userId === f.agent.id)?.region).toMatchObject({
        region: 'central',
        provinceName: f.group.province,
      });
    } finally {
      spy.mockRestore();
      raw.mockRestore();
    }
  });
  it('industry child inherits province, vacant director and no group are explicit', async () => {
    const f = await regionalShareFixture(t, 'south');
    await t.prisma.db.groupMember.deleteMany({ where: { userId: f.agent.id } });
    const projection = t.app.get(RegionalProjectionRepository);
    expect(await projection.affiliateRegions([f.agent.id])).toEqual([]);
    const child = await t.prisma.db.group.create({
      data: {
        slug: randomUUID(),
        name: 'Industry child',
        kind: 'industry',
        industry: randomUUID(),
        province: f.group.province,
        region: 'south',
        parentId: f.group.id,
      },
    });
    await t.prisma.db.groupMember.create({
      data: { groupId: child.id, userId: f.agent.id, status: 'member' },
    });
    await t.prisma.db.regionalDirector.update({
      where: { region: 'south' },
      data: { userId: null, appointedAt: null },
    });
    expect(await projection.affiliateRegions([f.agent.id])).toEqual([
      expect.objectContaining({
        region: 'south',
        provinceName: f.group.province,
        directorName: null,
      }),
    ]);
  });
});
