import { COMMISSION_PLAN_LABEL } from '../../../api-domains';
import {
  REVENUE_DEMO,
  revenueDemoPeople,
  revenueDemoCustomers,
  revenueDemoReceipt,
} from '../../../fixtures/revenue-demo';
import { REVENUE_POLICY_DEFAULTS } from '../../../fixtures/revenue-sharing';
import { affiliateMockState, mockCommissionAmount } from '../affiliate';
import { readMockAffiliatePolicy } from '../affiliate-policy';
import { mockDirectorState } from '../regional-directors/state';
import { mockDb } from '../store';
import { captureMockRevenue, drainMockRevenue } from './capture';
import { mockRevenueState } from './state';

/** One opt-in data scenario shared with native seed; persisted shares are the bootstrap marker. */
export function seedMockRevenueScenario(): void {
  const state = mockRevenueState();
  if (state.shares.some((r) => r.customerId === revenueDemoCustomers[0]?.id)) return;
  const directors = mockDirectorState();
  const north = directors.config.slots.find((r) => r.region === 'north');
  if (north?.incumbent?.id !== REVENUE_DEMO.directorId)
    throw new Error('Missing north demo incumbent');
  seedPeople();
  north.incumbent.appointedAt = REVENUE_DEMO.appointedAt;
  directors.history.push({
    id: REVENUE_DEMO.historyId,
    region: 'north',
    action: 'appointed',
    memberName: north.incumbent.fullName,
    actorName: 'Super Admin',
    actorRole: 'Super Admin',
    at: REVENUE_DEMO.appointedAt,
    summary: `Bổ nhiệm GĐ Vùng Miền Bắc · ${north.incumbent.fullName}`,
  });
  directors.recipientBanks.push({ directorId: north.incumbent.id, bank: north.bank });
  state.policy = { ...REVENUE_POLICY_DEFAULTS };
  state.first.push(...revenueDemoPeople.map((p): [string, string] => [p.id, p.first]));
  for (const person of revenueDemoCustomers) {
    const id = captureMockRevenue(revenueDemoReceipt(person));
    const pending = state.pending.find((r) => r.id === id);
    if (!pending) throw new Error('Missing sharing demo capture');
    pending.id = person.shareId;
  }
  drainMockRevenue();
}

function seedPeople(): void {
  const db = mockDb();
  const s = affiliateMockState();
  const rate = readMockAffiliatePolicy().defaultRate;
  for (const p of revenueDemoPeople) {
    db.fees.push({
      userId: p.id,
      memberCode: p.memberCode,
      fullName: p.name,
      email: p.email,
      phone: '',
      accountType: p.plan,
      joinedAt: p.first,
      status: 'active',
      groups: [],
      paidAt: REVENUE_DEMO.receivedAt,
      validUntil: '2027-09-15T03:00:00.000Z',
      amount: p.amount,
    });
    db.userStatus.set(p.id, 'active');
    s.agents.set(p.id, {
      userId: p.id,
      code: p.code,
      name: p.name,
      email: p.email,
      rate,
      bank: null,
    });
    s.knownFees.set(p.id, REVENUE_DEMO.receivedAt);
    if (p.referred)
      s.referrals.set(p.id, {
        userId: p.id,
        agentId: REVENUE_DEMO.agentId,
        month: p.first.slice(0, 7),
        plan: p.plan,
        row: {
          id: `referral-${p.id}`,
          name: p.name,
          plan: COMMISSION_PLAN_LABEL[p.plan],
          date: p.first,
          feeAmount: p.amount,
          rate,
          commission: mockCommissionAmount(p.amount, rate),
          status: 'recorded',
          cancelReason: null,
        },
      });
  }
  const group = db.groups.find(
    (g) => g.kind === 'province' && g.province === REVENUE_DEMO.province,
  );
  if (!group) throw new Error('Missing demo province');
  db.groupMembers.set(REVENUE_DEMO.agentId, new Map([[group.id, 'member']]));
  group.memberCount++;
}
