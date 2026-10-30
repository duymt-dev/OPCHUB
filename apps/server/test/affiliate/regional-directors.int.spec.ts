import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  directorConfigSchema,
  directorHistorySchema,
  directorMemberPageSchema,
} from '@opchub/shared/api-domains';
import { isFeeUsable } from '@opchub/shared';
import { FeeEventsHandler, FeeSchedulerService, usableFeeWhere } from '@/modules/membership-fee';
import { OutboxRelayService } from '@/common/outbox';
import { AuthStateService } from '@/common/auth';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { RegionalDirectorService } from '@/modules/affiliate';
import { createUser, flushAuthState, loginOf, tokenBodySchema } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-616 regional director HTTP and transactions', () => {
  let t: TestApp;
  let token: string;
  let actorId: string;
  const members: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.prisma.db.regionalDirectorHistory.deleteMany({});
    await t.prisma.db.regionalDirector.updateMany({ data: { userId: null, appointedAt: null } });
    await t.prisma.db.user.deleteMany({ where: { id: { in: members } } });
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
    // Deterministic test clocks can create future entries; every test owns a fresh history fixture.
    await t.prisma.db.regionalDirectorHistory.deleteMany({});
    await t.prisma.db.regionalDirector.updateMany({ data: { userId: null, appointedAt: null } });
    await t.prisma.db.membershipFee.deleteMany({ where: { userId: { in: members } } });
    await t.prisma.db.regionalDirectorProvince.deleteMany({});
    const admin = await createUser(t, { systemRole: 'admin' });
    actorId = admin.id;
    token = tokenBodySchema.parse(await (await loginOf(t, admin)).json()).accessToken;
  });

  async function member(
    status: 'trial' | 'active' | 'expiring' | 'expired' | 'pending_payment' = 'trial',
    locked = false,
  ) {
    const row = await createUser(t, { fee: status, status: locked ? 'locked' : 'active' });
    members.push(row.id);
    return row;
  }
  async function config() {
    const response = await t.call('/admin/gdv', { token });
    expect(response.status).toBe(200);
    return directorConfigSchema.parse(await response.json());
  }
  async function appoint(userId: string, region: 'north' | 'central' | 'south' = 'north') {
    const slot = (await config()).slots.find((s) => s.region === region);
    if (!slot) throw new Error('Missing permanent region');
    return t.call('/admin/gdv', {
      method: 'POST',
      token,
      json: { userId, region, version: slot.version },
    });
  }
  async function revoke(region = 'north') {
    const slot = (await config()).slots.find((s) => s.region === region);
    return t.call(`/admin/gdv/${region}`, {
      method: 'DELETE',
      token,
      json: { version: slot?.version },
    });
  }

  it.each(['trial', 'active', 'expiring', 'expired', 'pending_payment'] as const)(
    'AT-GDV01 BR-462 appoint/revoke %s preserves exact previous term and mail/outbox',
    async (status) => {
      const user = await member(status);
      const now = new Date();
      const original = await t.prisma.db.membershipFee.findUniqueOrThrow({
        where: { userId: user.id },
      });
      expect((await appoint(user.id)).status).toBe(200);
      const during = await t.prisma.db.membershipFee.findUniqueOrThrow({
        where: { userId: user.id },
      });
      expect(during.status).toBe('regional_director');
      expect(during.directorPreviousStatus).toBe(status);
      expect(during.validUntil).toEqual(original.validUntil);
      expect(during.paidAt).toEqual(original.paidAt);
      expect(isFeeUsable(during, new Date('2099-01-01'))).toBe(true);
      expect((await revoke()).status).toBe(200);
      const after = await t.prisma.db.membershipFee.findUniqueOrThrow({
        where: { userId: user.id },
      });
      const expected =
        status === 'trial'
          ? 'trial'
          : status === 'active' || status === 'expiring'
            ? 'active'
            : 'pending_payment';
      expect(after.status).toBe(expected);
      expect(after.validUntil).toEqual(original.validUntil);
      expect(after.directorPreviousStatus).toBeNull();
      expect(
        await t.prisma.db.mailLog.count({
          where: { to: user.email, kind: { in: ['director_appointed', 'director_revoked'] } },
        }),
      ).toBe(2);
      expect(
        await t.prisma.db.outboxEvent.count({
          where: {
            type: 'membership_fee.changed',
            createdAt: { gte: now },
            payload: { path: ['userId'], equals: user.id },
          },
        }),
      ).toBe(2);
    },
  );

  it('AT-GDV03 Kế toán reads but direct appointment/config/revoke calls are forbidden', async () => {
    const accountant = await createUser(t, { adminPermissions: ['affiliate.view'] });
    token = tokenBodySchema.parse(await (await loginOf(t, accountant)).json()).accessToken;
    expect((await config()).slots).toHaveLength(3);
    const user = await member();
    expect((await appoint(user.id)).status).toBe(403);
    expect(
      (
        await t.call('/admin/gdv/north', {
          method: 'PATCH',
          token,
          json: { version: 1, provinces: [], bank: null },
        })
      ).status,
    ).toBe(403);
    expect((await revoke()).status).toBe(403);
  });

  it('AT-GDV05 concurrent appointments keep one director/region and one region/member', async () => {
    const first = await member();
    const other = await member();
    const slot = (await config()).slots.find((s) => s.region === 'north');
    const responses = await Promise.all(
      [first, other].map((user) =>
        t.call('/admin/gdv', {
          method: 'POST',
          token,
          json: { userId: user.id, region: 'north', version: slot?.version },
        }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const incumbent = (await config()).slots.find((s) => s.region === 'north')?.incumbent;
    if (!incumbent) throw new Error('Missing director');
    expect((await appoint(incumbent.id, 'central')).status).toBe(409);
    expect(
      await t.prisma.db.regionalDirectorHistory.count({ where: { actorId, action: 'appointed' } }),
    ).toBe(1);
  });

  it('AT-GDV06 locked members are excluded and stale input is rejected by the server', async () => {
    const user = await member('trial', true);
    const response = await t.call(`/admin/gdv/members?q=${encodeURIComponent(user.email)}`, {
      token,
    });
    expect(response.status).toBe(200);
    expect(directorMemberPageSchema.parse(await response.json()).items).toEqual([]);
    expect((await appoint(user.id)).status).toBe(409);
    expect(await t.prisma.db.mailLog.count({ where: { to: user.email } })).toBe(0);
  });

  it('REQ-616 province uniqueness, stale version, unknown province and bank configuration', async () => {
    const initial = await config();
    const north = initial.slots.find((s) => s.region === 'north');
    const central = initial.slots.find((s) => s.region === 'central');
    const patch = { version: north?.version, provinces: ['Hà Nội'], bank: null };
    expect((await t.call('/admin/gdv/north', { method: 'PATCH', token, json: patch })).status).toBe(
      200,
    );
    expect((await t.call('/admin/gdv/north', { method: 'PATCH', token, json: patch })).status).toBe(
      409,
    );
    expect(
      (
        await t.call('/admin/gdv/central', {
          method: 'PATCH',
          token,
          json: { ...patch, version: central?.version },
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await t.call('/admin/gdv/central', {
          method: 'PATCH',
          token,
          json: { ...patch, version: central?.version, provinces: ['Invalid'] },
        })
      ).status,
    ).toBe(400);
  });

  it('AT-GDV07 history contains real actor/role and uses a compound keyset cursor', async () => {
    const user = await member();
    expect((await appoint(user.id)).status).toBe(200);
    expect((await revoke()).status).toBe(200);
    const response = await t.call('/admin/gdv/history?region=north&size=1', { token });
    expect(response.status).toBe(200);
    const history = directorHistorySchema.parse(await response.json());
    const person = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { fullName: true },
    });
    const actor = await t.prisma.db.adminUser.findUniqueOrThrow({
      where: { id: actorId },
      select: { name: true },
    });
    expect(history.items[0]).toMatchObject({
      action: 'revoked',
      memberName: person.fullName,
      actorName: actor.name,
      actorRole: 'Quản trị viên',
    });
    expect(history.nextCursor).not.toBeNull();
    const cursor = history.nextCursor;
    if (!cursor) throw new Error('Expected cursor');
    const second = directorHistorySchema.parse(
      await (
        await t.call(
          `/admin/gdv/history?region=north&size=1&beforeAt=${encodeURIComponent(cursor.at)}&beforeId=${cursor.id}`,
          { token },
        )
      ).json(),
    );
    expect(second.items[0]?.id).not.toBe(history.items[0]?.id);
    expect(
      await t.prisma.db.auditLog.count({
        where: { actorId, action: { startsWith: 'regional_director.' } },
      }),
    ).toBe(2);
  });

  it('REQ-616 input 400 fields, unknown member 404 and oversized writes 413', async () => {
    const bad = await t.call('/admin/gdv', {
      method: 'POST',
      token,
      json: { region: 'east', userId: '', version: 0 },
    });
    expect(bad.status).toBe(400);
    expect(
      ((await bad.json()) as { error: { fields: unknown[] } }).error.fields.length,
    ).toBeGreaterThan(0);
    expect((await appoint('not-a-member')).status).toBe(404);
    expect(
      (await t.call('/admin/gdv', { method: 'POST', token, json: { large: 'x'.repeat(800_000) } }))
        .status,
    ).toBe(413);
  });

  it.each(['POST', 'PATCH', 'DELETE'] as const)(
    'REQ-616 oversized %s writes return 413, never 500',
    async (method) => {
      const response = await t.call(method === 'POST' ? '/admin/gdv' : '/admin/gdv/north', {
        method,
        token,
        json: { large: 'x'.repeat(800_000) },
      });
      expect(response.status).toBe(413);
    },
  );

  it('REQ-616 empty-slot revocation and malformed config/revoke input are rejected', async () => {
    expect((await revoke()).status).toBe(409);
    expect((await t.call('/admin/gdv/north', { method: 'DELETE', token, json: {} })).status).toBe(
      400,
    );
    const slot = (await config()).slots.find((row) => row.region === 'north');
    expect(
      (
        await t.call('/admin/gdv/north', {
          method: 'PATCH',
          token,
          json: {
            version: slot?.version,
            provinces: [],
            bank: { bankName: 'Vietcombank', bankNo: 'x', bankHolder: 'Name' },
          },
        })
      ).status,
    ).toBe(400);
    expect(await t.prisma.db.regionalDirectorHistory.count({ where: { actorId } })).toBe(0);
  });

  it('BR-462 exemption survives the scheduler; current directors cannot be charged', async () => {
    const user = await member('expired');
    const oldDeadline = new Date(Date.now() - 86_400_000);
    await t.prisma.db.membershipFee.update({
      where: { userId: user.id },
      data: { validUntil: oldDeadline },
    });
    expect((await appoint(user.id)).status).toBe(200);
    await t.app.get(FeeSchedulerService).sweep(new Date());
    expect(
      (await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: user.id } })).status,
    ).toBe('regional_director');
    const response = await t.call(`/admin/fees/${user.id}/collect`, { method: 'POST', token });
    expect(response.status).toBe(409);
    const reminder = await t.call('/admin/fees/remind', {
      method: 'POST',
      token,
      json: { userIds: [user.id] },
    });
    expect(reminder.status).toBe(202);
    expect(await reminder.json()).toEqual({ queued: 0 });
    await t.app.get(FeeSchedulerService).remind(new Date());
    expect(
      await t.prisma.db.mailLog.count({ where: { to: user.email, kind: 'fee_reminder' } }),
    ).toBe(0);
    expect(
      await t.prisma.db.membershipFee.findMany({
        where: { userId: user.id, ...usableFeeWhere(new Date('2099-01-01')) },
        select: { userId: true },
      }),
    ).toEqual([{ userId: user.id }]);
    const slot = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
    });
    await t.app
      .get(RegionalDirectorService)
      .revoke({ id: actorId, ip: null }, 'north', slot.version, new Date('2099-01-01'));
    const changed = await t.prisma.db.membershipFee.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(changed.status).toBe('pending_payment');
    expect(changed.validUntil).toEqual(oldDeadline);
  });

  it('AT-GDV01 AT-GDV02 relay updates the old token paywall and replay cannot resurrect revoked exemption', async () => {
    const user = await member('expired');
    const memberToken = tokenBodySchema.parse(await (await loginOf(t, user)).json()).accessToken;
    expect((await t.call('/members/suggest?q=ab', { token: memberToken })).status).toBe(402);
    expect((await appoint(user.id)).status).toBe(200);
    const event = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: {
        type: 'membership_fee.changed',
        payload: { path: ['userId'], equals: user.id },
      },
      select: { payload: true },
    });
    const relay = t.app.get(OutboxRelayService);
    const handler = t.app.get(FeeEventsHandler);
    relay.register('membership_fee.changed', (payload) => handler.handle(payload));
    for (let i = 0; i < 50; i++) {
      await relay.relayOnce();
      if ((await t.app.get(AuthStateService).fee(user.id))?.status === 'regional_director') break;
    }
    expect((await t.call('/members/suggest?q=ab', { token: memberToken })).status).toBe(200);
    expect((await revoke()).status).toBe(200);
    const staleAppointment = parseOutboxPayload('membership_fee.changed', event.payload);
    await handler.handle(staleAppointment);
    await handler.handle(staleAppointment);
    expect((await t.app.get(AuthStateService).fee(user.id))?.status).toBe('pending_payment');
    expect((await t.call('/members/suggest?q=ab', { token: memberToken })).status).toBe(402);
    relay.unregister('membership_fee.changed');
  });

  it('REQ-616 database constraints preserve slots, unique members/provinces and complete bank details', async () => {
    const user = await member();
    await t.prisma.db.regionalDirector.update({
      where: { region: 'north' },
      data: { userId: user.id, appointedAt: new Date() },
    });
    await expect(
      t.prisma.db.regionalDirector.update({
        where: { region: 'central' },
        data: { userId: user.id, appointedAt: new Date() },
      }),
    ).rejects.toThrow();
    await expect(
      t.prisma.db.regionalDirector.delete({ where: { region: 'north' } }),
    ).rejects.toThrow();
    await expect(
      t.prisma.db.regionalDirector.update({
        where: { region: 'south' },
        data: { bankNo: '123456789' },
      }),
    ).rejects.toThrow();
    await expect(
      t.prisma.db.regionalDirectorProvince.createMany({
        data: [
          { province: 'Hà Nội', region: 'north' },
          { province: 'Hà Nội', region: 'central' },
        ],
      }),
    ).rejects.toThrow();
    expect(await t.prisma.db.regionalDirector.count()).toBe(3);
  });

  it('REQ-616 a transaction failing before audit rolls back fee, region, history, mail and outbox', async () => {
    const user = await member('trial');
    const original = await t.prisma.db.membershipFee.findUniqueOrThrow({
      where: { userId: user.id },
    });
    const slot = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: 'north' },
    });
    await expect(
      t.app.get(RegionalDirectorService).appoint(
        { id: 'missing-admin', ip: null },
        {
          region: 'north',
          userId: user.id,
          version: slot.version,
        },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(
      await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: user.id } }),
    ).toEqual(original);
    expect(
      (await t.prisma.db.regionalDirector.findUniqueOrThrow({ where: { region: 'north' } })).userId,
    ).toBeNull();
    expect(await t.prisma.db.regionalDirectorHistory.count({ where: { userId: user.id } })).toBe(0);
    expect(await t.prisma.db.mailLog.count({ where: { to: user.email } })).toBe(0);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'membership_fee.changed', payload: { path: ['userId'], equals: user.id } },
      }),
    ).toBe(0);
  });
});
