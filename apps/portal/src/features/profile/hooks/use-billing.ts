'use client';

import { isFeeExempt, isFeeUsable, planOf } from '@opchub/shared';
import { myFeePeriodsSchema, myFundraisingsSchema } from '@opchub/shared/api-domains';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { billingRows, type BillingRow } from '../billing';

const fetchPeriods = () =>
  api('/me/membership/periods', { schema: myFeePeriodsSchema }).then((r) => r.items);
const fetchFundraisings = () =>
  api('/me/fundraisings', { schema: myFundraisingsSchema }).then((r) => r.items);

/**
 * Tab "Gói & thanh toán" (D-89, prototype `prBill`): gói của TK + lịch sử kỳ phí và Gói Gọi vốn.
 * Trạng thái phí đọc từ phiên (`me.membershipFee`, cập nhật qua `membership.updated`).
 */
export function useBilling(): {
  plan: 'personal' | 'business' | null;
  active: boolean;
  exempt: boolean;
  validUntil: string | null;
  feeRef: string;
  rows: BillingRow[];
  ready: boolean;
} {
  const me = useAuthStore((s) => s.me);
  const periods = useQuery({ queryKey: ['me', 'membership', 'periods'], queryFn: fetchPeriods });
  const funds = useQuery({ queryKey: ['me', 'fundraisings'], queryFn: fetchFundraisings });
  const fee = me?.membershipFee ?? null;
  // V-11: trial còn hạn = đang hoạt động (prototype `prBill` theo `until > now`)
  const active = isFeeUsable(fee, new Date());
  const exempt = fee ? isFeeExempt(fee.status) : false;
  return {
    plan: me ? planOf(me.accountType) : null,
    active,
    exempt,
    validUntil: active && !exempt ? (fee?.validUntil ?? null) : null,
    feeRef: fee?.transferRef ?? '',
    rows: billingRows(periods.data ?? [], funds.data ?? []),
    ready: periods.isFetched && funds.isFetched,
  };
}
