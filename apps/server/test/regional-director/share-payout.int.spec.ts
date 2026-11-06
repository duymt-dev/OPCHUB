import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  RegionalPayoutService,
  RegionalDirectorService,
  RegionalShareReadService,
  RegionalShareEventsHandler,
} from '@/modules/regional-director';
import { regionalShareFixture } from '../factories/regional-share.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createUser } from '../factories/user.factory';

describe('TIP-V46-802 regional payouts', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  it('pays closed months only, audit redacts bank and notification is idempotent', async () => {
    const f = await regionalShareFixture(t);
    await f.ledger.record(f.input);
    await f.ledger.record({ ...f.input, sourceId: randomUUID(), at: new Date('2026-11-02') });
    const result = await t.app
      .get(RegionalPayoutService)
      .record(f.who, f.region, f.director.id, randomUUID(), new Date('2026-11-04'));
    expect(result.monthKeys).toEqual(['2026-10']);
    expect(result.count).toBe(1);
    expect(
      await t.prisma.db.regionalShare.count({
        where: { directorUserId: f.director.id, status: 'pending' },
      }),
    ).toBe(1);
    const audit = await t.prisma.db.auditLog.findFirstOrThrow({ where: { entityId: result.id } });
    expect(JSON.stringify(audit)).not.toContain('123456789012');
    const handler = t.app.get(RegionalShareEventsHandler);
    const event = { payoutId: result.id, region: f.region, directorUserId: f.director.id };
    await handler.payout(event);
    await handler.payout(event);
    expect(
      await t.prisma.db.notification.count({ where: { id: `regional-payout:${result.id}` } }),
    ).toBe(1);
  });
  it('idempotency returns the durable receipt', async () => {
    const f = await regionalShareFixture(t);
    await f.ledger.record(f.input);
    const key = randomUUID();
    const service = t.app.get(RegionalPayoutService);
    const a = await service.record(f.who, f.region, f.director.id, key, new Date('2026-11-04'));
    expect(
      await service.record(f.who, f.region, f.director.id, key, new Date('2026-11-04')),
    ).toEqual(a);
    expect(await t.prisma.db.regionalPayout.count({ where: { id: a.id } })).toBe(1);
  });
  it('concurrency allows exactly one payout for different keys', async () => {
    const f = await regionalShareFixture(t);
    await f.ledger.record(f.input);
    const service = t.app.get(RegionalPayoutService);
    const results = await Promise.allSettled([
      service.record(f.who, f.region, f.director.id, randomUUID(), new Date('2026-11-04')),
      service.record(f.who, f.region, f.director.id, randomUUID(), new Date('2026-11-04')),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });
  it('payout totals exceed int32 without losing a dong', async () => {
    const f = await regionalShareFixture(t);
    await t.prisma.db.affiliatePolicy.update({
      where: { id: 1 },
      data: { regionalFirstYear: 50, regionalStep: 10, regionalMin: 20 },
    });
    await Promise.all(
      [1, 2, 3].map(() =>
        f.ledger.record({ ...f.input, sourceId: randomUUID(), baseAmount: 2_000_000_000 }),
      ),
    );
    const receipt = await t.app
      .get(RegionalPayoutService)
      .record(f.who, f.region, f.director.id, randomUUID(), new Date('2026-11-04'));
    expect(receipt.amount).toBe(3_000_000_000);
    expect(
      (await t.prisma.db.regionalPayout.findUniqueOrThrow({ where: { id: receipt.id } })).amount,
    ).toBe(3_000_000_000n);
  });
  it('AT-GDV04 pending shares survive revoke and use the old bank snapshot', async () => {
    const f = await regionalShareFixture(t);
    await f.ledger.record(f.input);
    await f.ledger.record({ ...f.input, sourceId: randomUUID() });
    await t.app.get(RegionalDirectorService).revoke(f.who, f.region, new Date('2026-11-15'));
    const next = await createUser(t, { fee: 'trial' });
    await t.app
      .get(RegionalDirectorService)
      .appoint(f.who, f.region, next.id, new Date('2026-11-15'));
    await f.ledger.record({ ...f.input, sourceId: randomUUID(), at: new Date('2026-11-16') });
    const row = (
      await t.app.get(RegionalShareReadService).list('', new Date('2026-12-01'))
    ).rows.find((r) => r.region === f.region);
    expect(row?.payees.map((p) => p.userId)).toEqual(
      expect.arrayContaining([f.director.id, next.id]),
    );
    const result = await t.app
      .get(RegionalPayoutService)
      .record(f.who, f.region, f.director.id, randomUUID(), new Date('2026-12-01'));
    expect(result.count).toBe(2);
    expect(result.directorUserId).toBe(f.director.id);
    expect(result.bankHolder).toBe('REGIONAL DIRECTOR');
    expect(
      await t.prisma.db.regionalShare.count({
        where: { directorUserId: next.id, status: 'pending' },
      }),
    ).toBe(1);
  });
});
