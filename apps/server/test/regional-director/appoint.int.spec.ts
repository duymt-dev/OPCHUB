import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { regionalDirectorsSchema, regionalCandidatesSchema } from '@opchub/shared/api-domains';
import { RegionalDirectorEventsHandler } from '@/modules/regional-director';
import { isFeeUsable } from '@opchub/shared';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('TIP-V46-801 regional director lifecycle', () => {
  let t: TestApp;
  let admin: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
  });
  beforeEach(async () => {
    await t.prisma.db.regionalDirectorEvent.deleteMany();
    await t.prisma.db.regionalDirector.updateMany({
      data: {
        userId: null,
        prevFeeStatus: null,
        prevValidUntil: null,
        appointedAt: null,
        appointedBy: null,
      },
    });
  });
  afterAll(async () => {
    await t.prisma.db.regionalDirector.updateMany({ data: { userId: null } });
    await t.close();
  });
  const appoint = (userId: string, region = 'south', token = admin) =>
    t.call('/admin/gdv', { method: 'POST', token, json: { region, userId } });
  const revoke = (region = 'south', token = admin) =>
    t.call(`/admin/gdv/${region}`, { method: 'DELETE', token });

  it.each(['pending_payment', 'trial', 'expired'] as const)(
    'AT-GDV01 appoints and frees fee from %s',
    async (status) => {
      const u = await createUser(t, { fee: status });
      const before = await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } });
      expect((await appoint(u.id)).status).toBe(200);
      const fee = await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } });
      expect(fee).toMatchObject({
        status: 'regional_director',
        validUntil: null,
        version: before.version + 1,
      });
      const slot = await t.prisma.db.regionalDirector.findUniqueOrThrow({
        where: { region: 'south' },
      });
      expect(slot).toMatchObject({
        userId: u.id,
        prevFeeStatus: before.status,
        prevValidUntil: before.validUntil,
      });
      expect(isFeeUsable(fee, new Date())).toBe(true);
      const outbox = await t.prisma.db.outboxEvent.findMany({
        where: {
          type: { in: ['regional_director.appointed', 'membership_fee.changed'] },
          payload: { path: ['userId'], equals: u.id },
        },
      });
      expect(outbox).toHaveLength(2);
    },
  );

  it('AT-GDV02 no remaining fee; AT-GDV04 preserves existing paid periods', async () => {
    const u = await createUser(t, { fee: 'expired' });
    const original = await t.prisma.db.user.findUniqueOrThrow({ where: { id: u.id } });
    const affiliate = await t.prisma.db.affiliate.create({
      data: {
        userId: u.id,
        code: `RD${u.id.replaceAll('-', '').slice(0, 10).toUpperCase()}`,
        rate: 10,
        bankName: 'Test Bank',
        bankNo: '123456789',
        bankHolder: 'TEST MEMBER',
      },
    });
    const period = await t.prisma.db.membershipFeePeriod.create({
      data: {
        userId: u.id,
        amount: 1_200_000,
        source: 'transfer',
        startsAt: new Date(Date.now() - 730 * 86_400_000),
        endsAt: new Date(Date.now() - 365 * 86_400_000),
      },
    });
    const periods = await t.prisma.db.membershipFeePeriod.count({ where: { userId: u.id } });
    expect((await appoint(u.id)).status).toBe(200);
    expect((await revoke()).status).toBe(200);
    const fee = await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } });
    expect(fee).toMatchObject({ status: 'pending_payment', validUntil: null });
    expect(isFeeUsable(fee, new Date())).toBe(false);
    expect(await t.prisma.db.membershipFeePeriod.count({ where: { userId: u.id } })).toBe(periods);
    expect(
      await t.prisma.db.membershipFeePeriod.findUniqueOrThrow({ where: { id: period.id } }),
    ).toEqual(period);
    expect(await t.prisma.db.affiliate.findUniqueOrThrow({ where: { userId: u.id } })).toEqual(
      affiliate,
    );
    expect(await t.prisma.db.user.findUniqueOrThrow({ where: { id: u.id } })).toEqual(original);
    expect((await revoke()).status).toBe(409);
  });

  it.each([
    ['trial', 20, 'trial'],
    ['active', 10, 'expiring'],
    ['active', 40, 'active'],
  ] as const)('AT-GDV02 restores %s with %i days as %s', async (status, days, expected) => {
    const u = await createUser(t, { fee: status });
    const until = new Date(Date.now() + days * 86_400_000);
    await t.prisma.db.membershipFee.update({
      where: { userId: u.id },
      data: { validUntil: until },
    });
    expect((await appoint(u.id)).status).toBe(200);
    expect((await revoke()).status).toBe(200);
    expect(
      await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } }),
    ).toMatchObject({ status: expected, validUntil: until });
  });

  it('AT-GDV03 read-only permission rejects every write without audit', async () => {
    const token = await tokenOf(t, await createUser(t, { adminPermissions: ['affiliate.view'] }));
    const u = await createUser(t, { fee: 'trial' });
    const before = await t.prisma.db.auditLog.count({ where: { entity: 'regional_director' } });
    const read = await t.call('/admin/gdv', { token });
    expect(read.status).toBe(200);
    expect(regionalDirectorsSchema.parse(await read.json()).canManage).toBe(false);
    expect((await appoint(u.id, 'south', token)).status).toBe(403);
    expect((await revoke('south', token)).status).toBe(403);
    expect(
      (await t.call('/admin/gdv/south', { method: 'PATCH', token, json: { provinces: [] } }))
        .status,
    ).toBe(403);
    expect(await t.prisma.db.auditLog.count({ where: { entity: 'regional_director' } })).toBe(
      before,
    );
  });

  it('TC-462 BR-464 revoke preserves valid fee and persists dated mail and notification once', async () => {
    const u = await createUser(t, { fee: 'active' });
    const until = new Date(Date.now() + 40 * 86_400_000);
    await t.prisma.db.membershipFee.update({
      where: { userId: u.id },
      data: { validUntil: until },
    });
    expect((await appoint(u.id)).status).toBe(200);
    expect((await revoke()).status).toBe(200);
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'regional_director.revoked', payload: { path: ['userId'], equals: u.id } },
    });
    const payload = {
      region: 'south' as const,
      userId: u.id,
      validUntil: until.toISOString(),
      revokedAt: event.createdAt.toISOString(),
    };
    const handler = t.app.get(RegionalDirectorEventsHandler);
    await handler.revoked(payload, String(event.id));
    await handler.revoked(payload, String(event.id));
    const date = until.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const mails = await t.prisma.db.mailLog.findMany({
      where: { to: u.email, kind: 'regional_director' },
    });
    expect(mails).toHaveLength(1);
    expect(mails[0]?.subject).toContain(`Miền Nam · phí thành viên còn hiệu lực đến ${date}`);
    expect(mails[0]?.bodyHtml).toContain(`Phí thành viên cũ còn hiệu lực đến ${date}`);
    const notifications = await t.prisma.db.notification.findMany({
      where: { userId: u.id, type: 'system' },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.body).toContain(`Phí thành viên cũ còn hiệu lực đến ${date}`);
    expect(notifications[0]?.title).toBe('Kết thúc vai trò GĐ Vùng Miền Nam');
    const fee = await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: u.id } });
    expect(fee).toMatchObject({ status: 'active', validUntil: until });
    expect(isFeeUsable(fee, new Date())).toBe(true);
  });

  it('AT-GDV05 rejects another region and excludes its occupant from candidates', async () => {
    const u = await createUser(t, { fee: 'trial' });
    expect((await appoint(u.id, 'north')).status).toBe(200);
    expect((await appoint(u.id, 'south')).status).toBe(409);
    const r = await t.call(`/admin/gdv/candidates?region=south&q=${encodeURIComponent(u.email)}`, {
      token: admin,
    });
    expect(regionalCandidatesSchema.parse(await r.json()).items).toEqual([]);
  });

  it('AT-GDV06 locked users and investors cannot be appointed', async () => {
    for (const spec of [{ status: 'locked' as const }, { accountType: 'investor' as const }]) {
      const u = await createUser(t, { ...spec, fee: 'trial' });
      expect((await appoint(u.id)).status).toBe(422);
      const r = await t.call(
        `/admin/gdv/candidates?region=south&q=${encodeURIComponent(u.email)}`,
        { token: admin },
      );
      expect(regionalCandidatesSchema.parse(await r.json()).items).toEqual([]);
    }
  });

  it('AT-GDV07 replacement records revoke then appoint and audit', async () => {
    const a = await createUser(t, { fee: 'trial' });
    const b = await createUser(t, { fee: 'expired' });
    expect((await appoint(a.id)).status).toBe(200);
    expect((await appoint(b.id)).status).toBe(200);
    const history = await t.prisma.db.regionalDirectorEvent.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(history.map((e) => [e.action, e.userId])).toEqual([
      ['appoint', a.id],
      ['revoke', a.id],
      ['appoint', b.id],
    ]);
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'regional_director.revoke', diff: { path: ['userId'], equals: a.id } },
      }),
    ).toBe(1);
  });

  it('province rules reject a province from another region', async () => {
    const province = await t.prisma.db.group.findFirstOrThrow({
      where: { kind: 'province', region: 'north' },
    });
    const r = await t.call('/admin/gdv/south', {
      method: 'PATCH',
      token: admin,
      json: { provinces: [province.province] },
    });
    expect(r.status).toBe(422);
    const unknown = await t.call('/admin/gdv/south', {
      method: 'PATCH',
      token: admin,
      json: { provinces: ['Unknown Province'] },
    });
    expect(unknown.status).toBe(422);
    expect(await unknown.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        fields: [{ path: 'provinces' }],
      },
    });
  });

  it('outbox retries create one password-free email and one system notification', async () => {
    const u = await createUser(t, { fee: 'trial' });
    expect((await appoint(u.id)).status).toBe(200);
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'regional_director.appointed', payload: { path: ['userId'], equals: u.id } },
    });
    const handler = t.app.get(RegionalDirectorEventsHandler);
    const payload = { region: 'south' as const, userId: u.id, provinces: ['Cà Mau'] };
    await handler.appointed(payload, String(event.id));
    await handler.appointed(payload, String(event.id));
    const mail = await t.prisma.db.mailLog.findMany({
      where: { to: u.email, kind: 'regional_director' },
    });
    expect(mail).toHaveLength(1);
    expect(mail[0]?.bodyHtml).toContain('/huong-dan');
    expect(mail[0]?.bodyHtml).not.toContain(u.password);
    expect(await t.prisma.db.notification.count({ where: { userId: u.id, type: 'system' } })).toBe(
      1,
    );
  });
});
