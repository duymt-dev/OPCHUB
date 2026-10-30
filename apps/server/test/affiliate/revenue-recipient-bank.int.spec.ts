import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AffiliateBank } from '@opchub/shared/api-domains';
import { RegionalDirectorService, RevenuePayoutService } from '@/modules/affiliate';
import { createRevenueApp, createRevenueCase, type RevenueCase } from './revenue-sharing.fixture';
import type { TestApp } from '../setup/test-app';

describe('AT-GDV04 beneficiary bank ownership across appointments', () => {
  let t: TestApp;
  let c: RevenueCase;
  beforeAll(async () => {
    t = await createRevenueApp();
  });
  beforeEach(async () => {
    c = await createRevenueCase(t);
  });
  afterEach(async () => {
    await c?.cleanup();
  });
  afterAll(async () => {
    await t?.close();
  });
  const actor = () => ({ id: c.actor.id, ip: null });
  const slot = () => t.prisma.db.regionalDirector.findUniqueOrThrow({ where: { region: 'north' } });
  const pay = (directorId = c.director.id) =>
    t.app
      .get(RevenuePayoutService)
      .record(actor(), directorId, '2026-09', randomUUID(), new Date('2026-10-01'));
  const earn = async () => {
    const user = await c.customer();
    const period = await c.collect(user.id, '2026-09-15');
    return c.deliver(period.id);
  };
  const revoke = async () =>
    t.app
      .get(RegionalDirectorService)
      .revoke(actor(), 'north', (await slot()).version, new Date('2026-09-20'));
  const appoint = async (userId: string) =>
    t.app.get(RegionalDirectorService).appoint(
      actor(),
      {
        region: 'north',
        userId,
        version: (await slot()).version,
      },
      new Date('2026-09-01'),
    );
  const configure = async (bank: AffiliateBank | null) => {
    const provinces = await t.prisma.db.regionalDirectorProvince.findMany({
      where: { region: 'north' },
    });
    // Synthetic factory province is not in the production catalogue; restore fixture mapping separately.
    await t.app.get(RegionalDirectorService).configure(actor(), 'north', {
      version: (await slot()).version,
      bank,
      provinces: [],
    });
    await t.prisma.db.regionalDirectorProvince.createMany({ data: provinces });
  };
  const correctedBank = {
    bankName: 'Vietcombank',
    bankNo: '88888888',
    bankHolder: 'DIRECTOR',
  } as const;

  it('D-121 replacement neither inherits predecessor bank nor pays to it before explicit configuration', async () => {
    await earn();
    await revoke();
    const replacement = await c.newMember();
    await appoint(replacement.id);
    expect(await slot()).toMatchObject({
      userId: replacement.id,
      bankName: null,
      bankNo: null,
      bankHolder: null,
    });
    const share = await earn();
    expect(share).toMatchObject({ directorId: replacement.id, bankNo: null });
    await expect(pay(replacement.id)).rejects.toMatchObject({ code: 'CONFLICT' });
    await configure(correctedBank);
    expect(await pay(replacement.id)).toMatchObject({
      directorId: replacement.id,
      bank: correctedBank,
    });
    expect(await pay()).toMatchObject({
      directorId: c.director.id,
      bank: { bankNo: '0123456789' },
    });
  });

  it.each([null, '0123456789'])(
    'AT-GDV04 bank corrected after last earning (%s) survives revocation',
    async (oldNo) => {
      if (!oldNo) await configure(null);
      const share = await earn();
      expect(share.bankNo).toBe(oldNo);
      await configure(correctedBank);
      await revoke();
      expect(await pay()).toMatchObject({ directorId: c.director.id, bank: correctedBank });
      // Payout destination does not rewrite the historical receipt-capture bank snapshot.
      expect(
        (await t.prisma.db.revenueShare.findUniqueOrThrow({ where: { id: share.id } })).bankNo,
      ).toBe(oldNo);
    },
  );

  it('D-121 reappointment restores only the same beneficiary bank, never a predecessor bank', async () => {
    await configure(correctedBank);
    await revoke();
    const replacement = await c.newMember();
    await appoint(replacement.id);
    await configure({ ...correctedBank, bankNo: '77777777' });
    await revoke();
    await appoint(c.director.id);
    expect(await slot()).toMatchObject({ userId: c.director.id, ...correctedBank });
  });

  it('AT-GDV04 explicit bank clearing persists after revocation; no stale snapshot fallback', async () => {
    await earn();
    await configure(null);
    await revoke();
    await expect(pay()).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await t.prisma.db.revenuePayout.count({ where: { directorId: c.director.id } })).toBe(0);
  });
});
