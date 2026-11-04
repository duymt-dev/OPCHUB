import type { AffiliateBank } from '../../../api-domains';
import { affiliateMockState, syncMockAffiliates } from '../affiliate';

export type MockAffiliateState = ReturnType<typeof affiliateMockState>;
export type MockAffiliateReferral =
  MockAffiliateState['referrals'] extends Map<string, infer R> ? R : never;
interface PaidSnapshot {
  paidAt: string | null;
  bank: AffiliateBank | null;
}
interface Extra {
  snapshots: Map<string, PaidSnapshot>;
  receipts: Map<string, { paid: number; amount: number }>;
}
const states = new WeakMap<MockAffiliateState, Extra>();

export function affiliateAdminState(): Extra {
  const key = affiliateMockState();
  let state = states.get(key);
  if (!state) {
    state = {
      snapshots: new Map(),
      receipts: new Map(),
    };
    states.set(key, state);
  }
  return state;
}

export function paidSnapshot(referral: MockAffiliateReferral): PaidSnapshot {
  if (referral.row.status !== 'paid') return { paidAt: null, bank: null };
  const snapshots = affiliateAdminState().snapshots;
  let value = snapshots.get(referral.row.id);
  if (!value) {
    const receipt = affiliateMockState()
      .payouts.get(referral.agentId)
      ?.find((r) => r.monthKey === referral.month);
    value = { paidAt: receipt?.paidAt ?? null, bank: receipt ? { ...receipt.bank } : null };
    snapshots.set(referral.row.id, value);
  }
  return value;
}

export function affiliateCommissionRefs() {
  return [
    ...new Map(
      [
        ...syncMockAffiliates().referrals.values(),
        ...affiliateMockState().referenceCommissions.values(),
      ].map((r) => [r.row.id, r]),
    ).values(),
  ].filter(
    (r) => r.row.status === 'recorded' || r.row.status === 'paid' || r.row.status === 'cancelled',
  );
}

export function mockAffiliatePage<T>(rows: T[], q: { page: number; size: number }) {
  return {
    items: rows.slice((q.page - 1) * q.size, q.page * q.size),
    total: rows.length,
    page: q.page,
    size: q.size,
  };
}

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
export const affiliateSearchMatches = (text: string, q = '') => fold(text).includes(fold(q.trim()));
