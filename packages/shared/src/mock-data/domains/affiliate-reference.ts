import { mockDb } from './store';
import { commissionRateFor } from '../../membership/commission-year';
import { customerYearOf, payoutMonthOf } from '../../membership/regional-share';
import { COMMISSION_PLAN_LABEL } from '../../api-domains';
import { affiliateMockState, mockCommissionAmount } from './affiliate';
import { readMockAffiliatePolicy } from './affiliate-policy';
import { regionalShareState } from './regional-share-state';
import { publishMockNotification } from './notification-runtime';

export function recordMockReference(
  input: {
    source: 'membership' | 'fundraising';
    sourceId: string;
    customerId: string;
    baseAmount: number;
    plan: 'personal' | 'business' | 'fundraising';
    at: string;
  },
  notify = true,
) {
  if (input.baseAmount <= 0) return;
  const state = affiliateMockState(),
    key = `${input.source}:${input.sourceId}`;
  if (state.referenceCommissions.has(key)) return;
  const ref = state.referrals.get(input.customerId);
  if (!ref || ref.agentId === input.customerId || ref.row.status === 'void') return;
  const p = readMockAffiliatePolicy();
  const customerYear = customerYearOf(
    regionalShareState().firstPaid.get(input.customerId) ?? input.at,
    input.at,
  );
  const rate = commissionRateFor(customerYear, {
    ...p,
    firstYearRate:
      input.source === 'fundraising'
        ? p.fundraisingRate
        : (state.agents.get(ref.agentId)?.rate ?? p.defaultRate),
  });
  const first = input.source === 'membership' && ref.row.status === 'pending';
  if (rate === null || mockCommissionAmount(input.baseAmount, rate) <= 0) return;
  const record = {
    ...ref,
    customerYear,
    plan: input.plan,
    month: payoutMonthOf(input.at),
    row: {
      ...ref.row,
      customerYear,
      source: input.source,
      id: first ? ref.row.id : key,
      rate,
      commission: mockCommissionAmount(input.baseAmount, rate),
      feeAmount: input.baseAmount,
      date: input.at,
      status: 'recorded' as const,
      plan: COMMISSION_PLAN_LABEL[input.plan],
    },
  };
  if (first) Object.assign(ref, record);
  state.referenceCommissions.set(key, record);
  if (notify)
    publishMockNotification(mockDb(), ref.agentId, {
      id: `reference:${key}`,
      read: false,
      type: 'affiliate',
      title: 'Hoa hồng đã ghi nhận',
      body: `${record.row.commission.toLocaleString('vi-VN')}đ`,
      link: '/affiliate',
      createdAt: input.at,
    });
}
