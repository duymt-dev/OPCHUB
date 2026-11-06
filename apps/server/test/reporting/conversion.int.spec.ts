import { Prisma, type MembershipFeeStatus } from '@opchub/db';
import { adminConversionSchema, csvFileSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  ConversionRepository,
  conversionQuery,
  type ConversionAggregate,
} from '@/modules/reporting/conversion.repository';
import { ConversionService, CONVERSION_CACHE_KEY } from '@/modules/reporting/conversion.service';
import { buildConversion } from '@/modules/reporting/conversion';
import { addMember, createGroup, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-623 BR-475-477 conversion by region', () => {
  let t: TestApp, token: string;
  let directorId = '',
    directorName = '';
  const ids: string[] = [],
    groups: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    token = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
    const north = await createGroup(t),
      central = await createGroup(t),
      south = await createGroup(t);
    groups.push(north.id, central.id, south.id);
    await t.prisma.db.group.update({ where: { id: north.id }, data: { region: 'north' } });
    await t.prisma.db.group.update({ where: { id: south.id }, data: { region: 'south' } });
    const add = async (status: MembershipFeeStatus, group: string | null, count: number) => {
      const users = await Promise.all(
        Array.from({ length: count }, () => createUser(t, { fee: status })),
      );
      ids.push(...users.map((u) => u.id));
      if (group)
        await t.prisma.db.groupMember.createMany({
          data: users.map((u) => ({ groupId: group, userId: u.id, status: 'member' as const })),
        });
      return users;
    };
    await add('trial', north.id, 4);
    const earlier = await add('active', north.id, 8);
    await add('expired', north.id, 2);
    await add('expiring', central.id, 7);
    await add('pending_payment', central.id, 3);
    await add('active', south.id, 1);
    await add('expired', south.id, 1);
    await add('active', null, 1);
    await add('expired', null, 1);
    const director = (await add('regional_director', north.id, 1))[0];
    if (!director) throw new Error('Missing director fixture');
    directorId = director.id;
    directorName = (
      await t.prisma.db.user.findUniqueOrThrow({
        where: { id: director.id },
        select: { fullName: true },
      })
    ).fullName;
    const investor = await createUser(t, { accountType: 'investor', fee: 'active' });
    ids.push(investor.id);
    const deleted = (await add('active', north.id, 1))[0];
    if (deleted)
      await t.prisma.db.user.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });
    // Earliest current province membership wins even with a later second membership.
    if (earlier[0]) await addMember(t, south.id, earlier[0].id);
  });
  afterAll(async () => {
    await t.prisma.db.group.deleteMany({ where: { id: { in: groups } } });
    await t.redis.client.del(CONVERSION_CACHE_KEY);
    await t.close();
  });

  it('rates from real fee rows:80/70/50, national71 including groupless; trial/exempt/investor/deleted rules', async () => {
    // CTEs restrict fixture INPUTS, not the actual exported production aggregate SQL.
    // No Prisma mock and no dependence on other suites\' retained members.
    const rows = await t.prisma.db.$queryRaw<ConversionAggregate[]>(Prisma.sql`
      WITH users AS (SELECT id,full_name,deleted_at,account_type FROM public.users WHERE id=ANY(${ids}::text[])),
        membership_fees AS (SELECT user_id,status FROM public.membership_fees WHERE user_id=ANY(${ids}::text[])),
        regional_directors AS (SELECT 'north'::region AS region,${directorId}::text AS user_id)
      ${conversionQuery}`);
    const data = buildConversion(rows);
    expect(data.rows.map((r) => [r.trial, r.paid, r.expired, r.ratePct])).toEqual([
      [4, 8, 2, 80],
      [0, 7, 3, 70],
      [0, 1, 1, 50],
    ]);
    expect(data.total).toEqual({ trial: 4, paid: 17, expired: 7, ratePct: 71 });
    expect(data.rows[0]?.directorName).toBe(directorName);
    expect(data.rows[2]?.directorName).toBeNull();
    const named = buildConversion([
      { region: 'north', directorName: 'Giám đốc Bắc', trial: 0n, paid: 8n, expired: 2n },
    ]);
    expect(named.rows[0]?.directorName).toBe('Giám đốc Bắc');
    expect(named.rows[2]?.ratePct).toBe(0);
  });

  it('cache60 seconds: two HTTP reads execute the real aggregate only once', async () => {
    await t.redis.client.del(CONVERSION_CACHE_KEY);
    const spy = vi.spyOn(t.app.get(ConversionRepository), 'aggregate');
    try {
      for (let i = 0; i < 2; i++) {
        const response = await t.call('/admin/overview/conversion', { token });
        expect(response.status).toBe(200);
        adminConversionSchema.parse(await response.json());
      }
      expect(spy).toHaveBeenCalledTimes(1);
      expect(await t.redis.client.ttl(CONVERSION_CACHE_KEY)).toBeGreaterThan(55);
    } finally {
      spy.mockRestore();
    }
  });

  it('CSV3 regions has BOM, exact columns, integer percentages and export audit; accountant403', async () => {
    const before = await t.prisma.db.auditLog.count({
      where: { action: 'report.conversion_export' },
    });
    const response = await t.call('/admin/overview/conversion/export', { method: 'POST', token });
    expect(response.status).toBe(200);
    const file = csvFileSchema.parse(await response.json());
    expect(file.filename).toBe('chuyen-doi-theo-vung.csv');
    expect(file.csv.charCodeAt(0)).toBe(0xfeff);
    expect(file.csv.split('\n')).toHaveLength(4);
    expect(file.csv.slice(1).split('\n')[0]).toBe(
      'Vùng,GĐ Vùng,Đang dùng thử,Đã trả phí,Hết hạn chưa trả,Tỷ lệ chuyển đổi',
    );
    expect(file.csv).toMatch(/"\d+%"/);
    expect(
      await t.prisma.db.auditLog.count({ where: { action: 'report.conversion_export' } }),
    ).toBe(before + 1);
    const denied = await tokenOf(t, await createUser(t, { adminPermissions: ['fees.view'] }));
    expect((await t.call('/admin/overview/conversion', { token: denied })).status).toBe(403);
    expect(
      (await t.call('/admin/overview/conversion/export', { method: 'POST', token: denied })).status,
    ).toBe(403);
    expect(t.app.get(ConversionService)).toBeTruthy();
  });
});
