import {
  AFFILIATE_DEMO_DAY,
  AFFILIATE_PAUSED_START,
  AFFILIATE_PAUSED_END,
  affiliateDemoAgents as agents,
  affiliateDemoCustomers as customers,
  affiliateDemoPaidAt,
  affiliateDemoStartedAt,
  demoAccounts,
} from '../../fixtures';
// D-69: kịch bản affiliate demo là kỳ lịch sử trước V4 (giá cũ 600.000)
import { COMMISSION_PLAN_LABEL } from '../../api-domains';
import { LEGACY_ANNUAL_FEE } from '../../membership/plans';
import { newMemberMe, mockPasswordOf, type MockLoginResult } from '../../mock-data';
import { affiliateMockState } from './affiliate';
import { seedMockAffiliatePayoutScenario } from './affiliate-payout-scenario';
import { mockDb, type MockDb } from './store';

const seeded = new WeakSet<MockDb>();
export const isMockAffiliateScenarioSeeded = () => seeded.has(mockDb());
/** Restoring a validated snapshot must not append AF0 rows again on the next request. */
export function restoreMockAffiliateScenarioSeeded(value: boolean): void {
  if (value) seeded.add(mockDb());
  else seeded.delete(mockDb());
}
const YEAR = 365 * 86_400_000;
const end = (start: string) => new Date(Date.parse(start) + YEAR).toISOString();

/** Same optional AF0 scenario as seed:demo --affiliate; never alters the base eight-member pack. */
function seedMockScenarioFees(): void {
  const db = mockDb();
  const s = affiliateMockState();
  const owners = agents.filter((a) => a.userId !== 'm1');
  const fees = [
    ...owners.map((a, i) => ({
      userId: a.userId,
      memberCode: `TV${800001 + i}`,
      fullName: a.name,
      email: a.email,
      start: affiliateDemoStartedAt(a.id),
    })),
    ...customers.map((c, i) => ({
      userId: c.userId,
      memberCode: `TV${810001 + i}`,
      fullName: c.name,
      email: `${c.userId}@demo.opchub.invalid`,
      start: c.paidAt,
    })),
  ];
  for (const f of fees) {
    db.fees.push({
      userId: f.userId,
      memberCode: f.memberCode,
      fullName: f.fullName,
      email: f.email,
      phone: '',
      accountType: 'personal',
      joinedAt: f.start,
      status: 'active',
      paidAt: f.start,
      validUntil: end(f.start),
      amount: LEGACY_ANNUAL_FEE,
    });
    db.userStatus.set(f.userId, 'active');
    s.knownFees.set(f.userId, f.start);
  }
  const me = db.fees.find((f) => f.userId === 'm1');
  if (me) {
    me.paidAt = affiliateDemoStartedAt('a1');
    me.validUntil = end(me.paidAt);
    s.knownFees.set(me.userId, me.paidAt);
  }
}

function seedMockScenarioAgents(): void {
  const s = affiliateMockState();
  for (const a of agents) {
    s.agents.set(a.userId, {
      userId: a.userId,
      code: a.code,
      name: a.name,
      email: a.email,
      rate: a.rate,
      bank: { ...a.bank },
    });
    s.clicks.set(a.userId, new Map([[AFFILIATE_DEMO_DAY, a.clicks]]));
  }
}

function seedMockScenarioHistory(): void {
  const s = affiliateMockState();
  for (const [i, c] of customers.entries()) {
    const a = agents.find((a) => a.id === c.affiliateId);
    if (!a) throw new Error('Unknown affiliate demo owner');
    const amount = (LEGACY_ANNUAL_FEE * a.rate) / 100;
    s.agents.set(c.userId, {
      userId: c.userId,
      code: `AFDEMO${String(i + 1).padStart(4, '0')}`,
      name: c.name,
      email: `${c.userId}@demo.opchub.invalid`,
      rate: 20,
      bank: null,
    });
    s.referrals.set(c.userId, {
      userId: c.userId,
      agentId: a.userId,
      month: c.month,
      // D-110: phí cũ 600.000 (D-69) chỉ có một gói → Cá nhân, như backfill migration
      plan: 'personal',
      row: {
        id: `demo-referral-${c.id}`,
        name: c.name,
        plan: COMMISSION_PLAN_LABEL.personal,
        date: c.paidAt,
        feeAmount: LEGACY_ANNUAL_FEE,
        rate: a.rate,
        commission: amount,
        status: c.status,
        cancelReason:
          c.status === 'cancelled' ? 'Thông tin giới thiệu không hợp lệ (dữ liệu demo)' : null,
      },
    });
    if (c.status !== 'paid') continue;
    const payouts = s.payouts.get(a.userId) ?? [];
    const existing = payouts.find((p) => p.monthKey === c.month);
    if (existing) {
      existing.count++;
      existing.amount += amount;
    } else
      payouts.push({
        monthKey: c.month,
        amount,
        count: 1,
        paidAt: affiliateDemoPaidAt(c.month),
        bank: { ...a.bank },
      });
    s.payouts.set(
      a.userId,
      payouts.sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
    );
  }
}

export function seedMockAffiliateScenario(
  options: { paused?: boolean; payout?: boolean } = {},
): void {
  const db = mockDb();
  if (seeded.has(db)) return;
  seedMockScenarioFees();
  seedMockScenarioAgents();
  seedMockScenarioHistory();
  if (options.paused) {
    const fee = db.fees.find((f) => f.userId === 'af-owner-a3');
    if (!fee) throw new Error('Missing paused affiliate');
    fee.status = 'expired';
    fee.joinedAt = AFFILIATE_PAUSED_START;
    fee.paidAt = AFFILIATE_PAUSED_START;
    fee.validUntil = AFFILIATE_PAUSED_END;
    affiliateMockState().knownFees.set(fee.userId, fee.paidAt);
  }
  if (options.payout) seedMockAffiliatePayoutScenario();
  seeded.add(db);
}

/** Extra AF0 owners are real accounts in the native pack, with the same demo password. */
export function mockAffiliateDemoLogin(
  email: string,
  password: string,
): MockLoginResult | undefined {
  const agent = agents.find(
    (a) => a.userId !== 'm1' && a.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!agent) return undefined;
  const fee = mockDb().fees.find((f) => f.userId === agent.userId);
  const pwd = demoAccounts.find((a) => a.role === 'user')?.pwd;
  if (!fee || !pwd || mockPasswordOf(agent.email, pwd) !== password) return undefined;
  const me = newMemberMe(agent.email, agent.name);
  return {
    ok: true,
    me: {
      ...me,
      id: agent.userId,
      needsDeclaration: false,
      membershipFee: {
        status: fee.status,
        validUntil: fee.validUntil,
        amount: fee.amount,
        transferRef: `OPCHUB ${fee.memberCode}`,
      },
    },
  };
}
