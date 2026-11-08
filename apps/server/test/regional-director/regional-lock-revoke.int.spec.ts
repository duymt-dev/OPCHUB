import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AdminUsersService,
  UserDeletionService,
  UserLifecycleHandler,
  LockEffectsRegistry,
} from '@/modules/account';
import {
  RegionalDirectorService,
  RegionalDirectorEventsHandler,
  RegionalShareEventsHandler,
  RegionalPayoutService,
} from '@/modules/regional-director';
import { AccountProcessor } from '@/worker/processors/account.processor';
import { RegionalDirectorProcessor } from '@/worker/processors/regional-director.processor';
import { OutboxService, type OutboxRelayService } from '@/common/outbox';
import { vi } from 'vitest';
import { scopedOutbox } from '../factories/scoped-outbox.factory';
import { regionalShareFixture } from '../factories/regional-share.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('TIP-V46-821 GDV-R05 automatic revocation through actual outbox relay', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    if (t) await t.close();
  });
  function register(relay: OutboxRelayService) {
    new AccountProcessor(
      relay,
      t.app.get(UserLifecycleHandler),
      t.app.get(UserDeletionService),
      t.app.get(LockEffectsRegistry),
    ).onApplicationBootstrap();
    new RegionalDirectorProcessor(
      relay,
      t.app.get(RegionalDirectorEventsHandler),
      t.app.get(RegionalShareEventsHandler),
    ).onApplicationBootstrap();
  }
  async function event(userId: string, type: string) {
    return t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type, payload: { path: ['userId'], equals: userId } },
      orderBy: { id: 'desc' },
    });
  }
  async function deliver(userId: string, type: string, replay = false) {
    const row = await event(userId, type);
    if (replay)
      await t.prisma.db.outboxEvent.update({
        where: { id: row.id },
        data: { dispatchedAt: null, lockedUntil: null },
      });
    const relay = scopedOutbox(t, [row.id], register);
    expect(await relay.relayOnce()).toBe(1);
    expect(await relay.relayOnce()).toBe(0);
    return row;
  }

  it('SPEC5/6 indefinite lock revokes once, retains old payout, vacant region earns Media Soft; unlock never restores', async () => {
    const f = await regionalShareFixture(t);
    await f.ledger.record(f.input);
    const before = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: f.region },
    });
    const users = t.app.get(AdminUsersService);
    await users.setStatus(f.who, [f.director.id], 'locked', 'Fixture indefinite lock');
    await deliver(f.director.id, 'user.locked');
    await deliver(f.director.id, 'user.locked', true);
    expect(
      await t.prisma.db.regionalDirector.findUniqueOrThrow({ where: { region: f.region } }),
    ).toMatchObject({ userId: null, bankNo: null });
    expect(
      await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: f.director.id } }),
    ).toMatchObject({ status: 'trial', validUntil: before.prevValidUntil });
    const revoked = await deliver(f.director.id, 'regional_director.revoked');
    expect(revoked.payload).toMatchObject({ reason: 'locked' });
    await deliver(f.director.id, 'regional_director.revoked', true);
    const events = await t.prisma.db.regionalDirectorEvent.findMany({
      where: { userId: f.director.id, action: 'revoke' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ actorId: 'system', actorRole: 'system' });
    expect(
      await t.prisma.db.auditLog.findFirstOrThrow({
        where: {
          action: 'regional_director.revoke',
          diff: { path: ['userId'], equals: f.director.id },
        },
      }),
    ).toMatchObject({ actorId: 'system', diff: { reason: 'locked' } });
    const mails = await t.prisma.db.mailLog.findMany({
      where: { to: f.director.email, kind: 'regional_director_revoke' },
    });
    expect(mails).toHaveLength(1);
    expect(mails[0]?.bodyHtml).toContain('do tài khoản bị khóa');
    const sourceId = randomUUID();
    await f.ledger.record({ ...f.input, sourceId });
    expect(await t.prisma.db.regionalShare.findFirstOrThrow({ where: { sourceId } })).toMatchObject(
      { directorUserId: null, directorAmount: 0, mediaSoftAmount: 1_200_000 },
    );
    const paid = await t.app
      .get(RegionalPayoutService)
      .record(f.who, f.region, f.director.id, randomUUID(), new Date('2026-12-01'));
    expect(paid.bankHolder).toBe('REGIONAL DIRECTOR');
    await users.setStatus(f.who, [f.director.id], 'active', null);
    await deliver(f.director.id, 'user.unlocked');
    expect(
      (await t.prisma.db.regionalDirector.findUniqueOrThrow({ where: { region: f.region } }))
        .userId,
    ).toBeNull();
  });

  it('SPEC5 temporary seven-day lock does not revoke', async () => {
    const f = await regionalShareFixture(t);
    await t.app
      .get(AdminUsersService)
      .setStatus(f.who, [f.director.id], 'locked', 'Temporary', new Date(), 7);
    await deliver(f.director.id, 'user.locked');
    expect(
      (await t.prisma.db.regionalDirector.findUniqueOrThrow({ where: { region: f.region } }))
        .userId,
    ).toBe(f.director.id);
    expect(
      await t.prisma.db.regionalDirectorEvent.count({
        where: { userId: f.director.id, action: 'revoke' },
      }),
    ).toBe(0);
  });

  it('SPEC8 deletion always revokes even after temporary lock and emits no revoked mail', async () => {
    const f = await regionalShareFixture(t);
    await t.app
      .get(AdminUsersService)
      .setStatus(f.who, [f.director.id], 'locked', 'Temporary', new Date(), 7);
    await t.app.get(UserDeletionService).softDelete(f.who, f.director.id);
    await deliver(f.director.id, 'user.deleted');
    await deliver(f.director.id, 'user.deleted', true);
    const revoked = await deliver(f.director.id, 'regional_director.revoked');
    expect(revoked.payload).toMatchObject({ reason: 'deleted' });
    expect(
      (await t.prisma.db.regionalDirector.findUniqueOrThrow({ where: { region: f.region } }))
        .userId,
    ).toBeNull();
    expect(
      await t.prisma.db.regionalDirectorEvent.count({
        where: { userId: f.director.id, action: 'revoke' },
      }),
    ).toBe(1);
    expect(
      await t.prisma.db.mailLog.count({
        where: { to: f.director.email, kind: 'regional_director_revoke' },
      }),
    ).toBe(0);
  });

  it('SPEC7 NOWAIT failure remains retryable and releases the transaction; replay later succeeds', async () => {
    const f = await regionalShareFixture(t);
    await t.app.get(AdminUsersService).setStatus(f.who, [f.director.id], 'locked', 'Indefinite');
    const row = await event(f.director.id, 'user.locked');
    const relay = scopedOutbox(t, [row.id], register);
    await t.prisma.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT region FROM regional_directors WHERE region=${f.region}::region FOR UPDATE`;
      expect(await relay.relayOnce()).toBe(0);
    });
    expect(
      await t.prisma.db.outboxEvent.findUniqueOrThrow({ where: { id: row.id } }),
    ).toMatchObject({ attempts: 1, dispatchedAt: null });
    await t.prisma.db.outboxEvent.update({ where: { id: row.id }, data: { lockedUntil: null } });
    expect(await relay.relayOnce()).toBe(1);
    expect(
      (await t.prisma.db.regionalDirector.findUniqueOrThrow({ where: { region: f.region } }))
        .userId,
    ).toBeNull();
    await expect(
      t.app.get(RegionalDirectorService).revokeBySystem([f.director.id], 'locked'),
    ).resolves.toBeUndefined();
  });

  it('SPEC6 outbox failure rolls back fee, slot, payee snapshot and history together', async () => {
    const f = await regionalShareFixture(t);
    await t.app.get(AdminUsersService).setStatus(f.who, [f.director.id], 'locked', 'Indefinite');
    const before = await t.prisma.db.membershipFee.findUniqueOrThrow({
      where: { userId: f.director.id },
    });
    const add = vi
      .spyOn(t.app.get(OutboxService), 'add')
      .mockRejectedValueOnce(new Error('outbox offline'));
    try {
      await expect(
        t.app.get(RegionalDirectorService).revokeBySystem([f.director.id], 'locked'),
      ).rejects.toThrow('outbox offline');
    } finally {
      add.mockRestore();
    }
    expect(
      await t.prisma.db.membershipFee.findUniqueOrThrow({ where: { userId: f.director.id } }),
    ).toEqual(before);
    expect(
      (await t.prisma.db.regionalDirector.findUniqueOrThrow({ where: { region: f.region } }))
        .userId,
    ).toBe(f.director.id);
    expect(
      await t.prisma.db.regionalDirectorEvent.count({
        where: { userId: f.director.id, action: 'revoke' },
      }),
    ).toBe(0);
    expect(
      await t.prisma.db.regionalPayeeBank.count({
        where: { region: f.region, userId: f.director.id },
      }),
    ).toBe(0);
    await deliver(f.director.id, 'user.locked');
  });
});
