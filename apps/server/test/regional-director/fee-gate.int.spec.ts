import { AdminFeesService } from '@/modules/membership-fee/services/admin-fees.service';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '@opchub/db';
import { usableFeeSql, usableFeeWhere } from '@/common/auth';
import { FeeSchedulerService, MembershipFeeService } from '@/modules/membership-fee';
import { RegionalDirectorService } from '@/modules/regional-director';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('TIP-V46-801 fee gates and concurrent writers', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  afterAll(() => t.close());

  it('open-ended fees pass both Prisma and SQL visibility gates', async () => {
    const u = await createUser(t, { fee: 'regional_director' });
    expect(
      await t.prisma.db.membershipFee.count({
        where: { userId: u.id, ...usableFeeWhere(new Date()) },
      }),
    ).toBe(1);
    const rows = await t.prisma.db.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT f.user_id AS id FROM membership_fees f WHERE f.user_id = ${u.id} AND ${usableFeeSql('f', new Date())}`);
    expect(rows).toEqual([{ id: u.id }]);
  });

  it('sweep and reminders never expire or email a regional director', async () => {
    const u = await createUser(t, { fee: 'regional_director' });
    await t.app.get(FeeSchedulerService).run(new Date());
    expect(
      (await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } })).status,
    ).toBe('regional_director');
    expect(await t.prisma.db.mailLog.count({ where: { to: u.email, kind: 'fee_reminder' } })).toBe(
      0,
    );
  });

  it('manual reminders skip and paid activation rejects a regional director', async () => {
    const u = await createUser(t, { fee: 'regional_director' });
    expect(await t.app.get(AdminFeesService).remind({ id: 'admin', ip: null }, [u.id])).toBe(0);
    await expect(
      t.prisma.db.$transaction((tx) =>
        t.app.get(MembershipFeeService).activate(
          tx,
          {
            userId: u.id,
            amount: 1_200_000,
            source: 'manual',
            reason: 'Test',
            collectedBy: 'admin',
          },
          new Date(),
        ),
      ),
    ).rejects.toThrow('Thành viên đang Miễn phí · GĐ Vùng');
  });

  it('two appointments of one member produce one winner and one conflict', async () => {
    await t.prisma.db.regionalDirector.updateMany({
      data: { userId: null, prevFeeStatus: null, prevValidUntil: null },
    });
    const u = await createUser(t, { fee: 'trial' });
    const token = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
    const responses = await Promise.all(
      ['north', 'south'].map((region) =>
        t.call('/admin/gdv', { method: 'POST', token, json: { region, userId: u.id } }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await t.prisma.db.regionalDirector.count({ where: { userId: u.id } })).toBe(1);
  });

  it('same-slot overlapping write fails fast with 409, not replacement', async () => {
    const u = await createUser(t, { fee: 'trial' });
    const service = t.app.get(RegionalDirectorService);
    await t.prisma.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT region FROM regional_directors WHERE region = 'central' FOR UPDATE`;
      await expect(
        service.appoint({ id: 'admin', role: 'Admin', ip: null }, 'central', u.id),
      ).rejects.toMatchObject({ status: 409 });
    });
  });
});
