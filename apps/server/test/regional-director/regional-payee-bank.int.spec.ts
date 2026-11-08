import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RegionalDirectorService, RegionalPayoutService } from '@/modules/regional-director';
import { regionalShareFixture } from '../factories/regional-share.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { tokenOf } from '../factories/group.factory';

describe('TIP-V46-821 payee bank isolation', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    if (t) await t.close();
  });

  it('new director never inherits previous payout account', async () => {
    const f = await regionalShareFixture(t);
    await f.ledger.record(f.input);
    const service = t.app.get(RegionalDirectorService);
    await service.revoke(f.who, f.region, new Date('2026-11-15'));
    const next = await createUser(t, { fee: 'trial' });
    await service.appoint(f.who, f.region, next.id, new Date('2026-11-15'));
    const slot = await t.prisma.db.regionalDirector.findUniqueOrThrow({
      where: { region: f.region },
    });
    expect(slot).toMatchObject({ bankName: null, bankNo: null, bankHolder: null });
    await f.ledger.record({
      ...f.input,
      sourceId: randomUUID(),
      at: new Date('2026-11-16'),
    });
    const payouts = t.app.get(RegionalPayoutService);
    await expect(
      payouts.record(f.who, f.region, next.id, randomUUID(), new Date('2026-12-01')),
    ).rejects.toThrow(/chưa cập nhật tài khoản nhận/);
    const old = await payouts.record(
      f.who,
      f.region,
      f.director.id,
      randomUUID(),
      new Date('2026-12-01'),
    );
    expect(old.bankHolder).toBe('REGIONAL DIRECTOR');
    await service.patch(f.who, f.region, {
      bank: { bankName: 'New Bank', bankNo: '987654321', bankHolder: 'NEW DIRECTOR' },
    });
    const receipt = await payouts.record(
      f.who,
      f.region,
      next.id,
      randomUUID(),
      new Date('2026-12-01'),
    );
    expect(receipt.bankHolder).toBe('NEW DIRECTOR');
  });

  it('SPEC4 enters a missing retired account, masks audit and retains strict permissions', async () => {
    const f = await regionalShareFixture(t);
    await f.ledger.record(f.input);
    await t.prisma.db.regionalDirector.update({
      where: { region: f.region },
      data: { bankName: null, bankNo: null, bankHolder: null },
    });
    await t.app.get(RegionalDirectorService).revoke(f.who, f.region);
    const token = await tokenOf(t, f.actor);
    const path = `/admin/regional-directors/${f.region}/payees/${f.director.id}/bank`;
    const bank = { bankName: 'Fixture Bank', bankNo: '555666777888', bankHolder: 'OLD DIRECTOR' };
    const put = (json: unknown, auth = token, url = path) =>
      t.call(url, { method: 'PUT', token: auth, json });
    expect((await put(bank)).status).toBe(200);
    const payout = await t.app
      .get(RegionalPayoutService)
      .record(f.who, f.region, f.director.id, randomUUID(), new Date('2026-12-01'));
    expect(payout.bankHolder).toBe(bank.bankHolder);
    const row = await t.prisma.db.auditLog.findFirstOrThrow({
      where: { action: 'regional_director.payee_bank', entityId: `${f.region}:${f.director.id}` },
    });
    expect(JSON.stringify(row.diff)).not.toContain(bank.bankNo);
    expect(row.diff).toMatchObject({ bankLast4: '7888' });
    const outsider = await createUser(t, { fee: 'trial' });
    expect(
      (await put(bank, token, `/admin/regional-directors/${f.region}/payees/${outsider.id}/bank`))
        .status,
    ).toBe(404);
    const viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['affiliate.view'] }));
    expect((await put(bank, viewer)).status).toBe(403);
    expect((await put({ ...bank, extra: true })).status).toBe(400);
    expect((await put({ ...bank, bankNo: 'abc' })).status).toBe(400);
    expect((await put({ ...bank, bankName: 'x'.repeat(1_100_000) })).status).toBe(413);
  });
});
