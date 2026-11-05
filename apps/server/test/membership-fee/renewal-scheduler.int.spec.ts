import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_RENEWAL, type RenewalSettings } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { AppSettingsService } from '@/modules/settings';
import { FeeSchedulerService } from '@/modules/membership-fee';
import { createUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
const DAY = 86_400_000,
  NOW = new Date('2098-12-01T01:00:00Z');
describe('REQ-620 REQ-204 automated renewal', () => {
  let t: TestApp, s: FeeSchedulerService;
  const config = async (c: RenewalSettings = structuredClone(DEFAULT_RENEWAL)) => {
    await t.prisma.db.appSetting.update({ where: { key: 'renewal' }, data: { value: c } });
    await t.app.get(AppSettingsService).invalidate('renewal');
  };
  beforeAll(async () => {
    t = await createTestApp();
    s = t.app.get(FeeSchedulerService);
  });
  beforeEach(async () => {
    await config();
  });
  afterAll(async () => {
    await config();
    await t.close();
  });
  async function member(days: number, spec: Parameters<typeof createUser>[1] = { fee: 'active' }) {
    const u = await createUser(t, spec);
    await t.prisma.db.membershipFee.update({
      where: { userId: u.id },
      data: { validUntil: new Date(NOW.getTime() + days * DAY) },
    });
    return u;
  }
  const markers = (userId: string) =>
    t.prisma.db.feeReminder.findMany({ where: { userId }, select: { milestone: true } });
  const mails = (to: string) =>
    t.prisma.db.mailLog.findMany({
      where: { to, kind: 'fee_reminder' },
      select: { bodyHtml: true, subject: true },
    });
  const notes = async (userId: string) =>
    (
      await t.prisma.db.outboxEvent.findMany({
        where: { type: 'membership_fee.reminded' },
        select: { payload: true },
      })
    )
      .flatMap((e) => parseOutboxPayload('membership_fee.reminded', e.payload).items)
      .filter((i) => i.userId === userId);
  it('milestones 30 7 1: catch up D7 once, none on day zero or after expiry', async () => {
    const u = await member(30);
    for (const d of [0, 0, 24, 24, 29, 29, 30, 33])
      await s.remind(new Date(NOW.getTime() + d * DAY));
    expect((await markers(u.id)).map((m) => m.milestone).sort()).toEqual(['D1', 'D30', 'D7']);
    expect(await mails(u.email)).toHaveLength(3);
  });
  it('disabled milestone: D7 disabled never falls back, D1 still sends', async () => {
    const u = await member(7);
    await config({ ...DEFAULT_RENEWAL, milestones: { d30: true, d7: false, d1: true } });
    await s.remind(NOW);
    expect(await markers(u.id)).toHaveLength(0);
    await s.remind(new Date(NOW.getTime() + 6 * DAY));
    expect(await markers(u.id)).toEqual([{ milestone: 'D1' }]);
  });
  it.each([
    { email: true, app: false },
    { email: false, app: true },
    { email: true, app: true },
  ])('channels %j', async (channels) => {
    const u = await member(7);
    await config({ ...DEFAULT_RENEWAL, channels });
    await s.remind(NOW);
    expect(await mails(u.email)).toHaveLength(channels.email ? 1 : 0);
    expect(await notes(u.id)).toHaveLength(channels.app ? 1 : 0);
    if (channels.app) expect((await notes(u.id))[0]?.title).toBe('Gói thành viên sắp hết hạn');
  });
  it('channels both off do not claim; enabling tomorrow still sends; all milestones off do not claim', async () => {
    const u = await member(7);
    await config({ ...DEFAULT_RENEWAL, channels: { email: false, app: false } });
    await s.remind(NOW);
    expect(await markers(u.id)).toHaveLength(0);
    await config();
    await s.remind(new Date(NOW.getTime() + DAY));
    expect(await markers(u.id)).toEqual([{ milestone: 'D7' }]);
    const v = await member(7);
    await config({ ...DEFAULT_RENEWAL, milestones: { d30: false, d7: false, d1: false } });
    await s.remind(NOW);
    expect(await markers(v.id)).toHaveLength(0);
  });
  it('audience: director/pending/expired/investor/locked excluded; trial D30 uses trial mail', async () => {
    const excluded = [];
    for (const fee of ['regional_director', 'pending_payment', 'expired'] as const)
      excluded.push(await member(7, { fee }));
    excluded.push(
      await member(7, { fee: 'active', accountType: 'investor' }),
      await member(7, { fee: 'active', status: 'locked' }),
    );
    const trial = await member(30, { fee: 'trial' });
    await s.remind(NOW);
    for (const u of excluded) expect(await markers(u.id)).toHaveLength(0);
    expect(await markers(trial.id)).toEqual([{ milestone: 'D30' }]);
    expect((await mails(trial.email))[0]).toMatchObject({
      subject: 'Sắp hết 3 tháng miễn phí OPC Hub',
    });
    expect((await mails(trial.email))[0]?.bodyHtml).toContain('3 tháng miễn phí');
  });
});
