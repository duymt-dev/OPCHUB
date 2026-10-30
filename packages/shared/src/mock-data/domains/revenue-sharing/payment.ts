import type { FeeRow } from '../../../api-domains';
import { captureMockRevenue } from './capture';

/** Call before overwriting fee.paidAt, so epoch initialization still sees the prior receipt. */
export function captureMockMembershipRevenue(
  fee: FeeRow,
  now: number,
  receipt?: { id: string; amount: number; receivedAt: string },
) {
  captureMockRevenue({
    source: 'membership',
    sourceId: receipt?.id ?? crypto.randomUUID(),
    customerId: fee.userId,
    plan: fee.accountType === 'business' ? 'business' : 'personal',
    amount: receipt?.amount ?? fee.amount,
    receivedAt: receipt?.receivedAt ?? new Date(now).toISOString(),
    recordedAt: new Date(now).toISOString(),
  });
}

export function captureMockFundraisingRevenue(
  id: string,
  customerId: string | undefined,
  amount: number,
  receivedAt = new Date().toISOString(),
  now = Date.now(),
) {
  if (!customerId) throw new Error('Missing fundraising receipt owner');
  captureMockRevenue({
    source: 'fundraising',
    sourceId: id,
    customerId,
    plan: 'fundraising',
    amount,
    receivedAt,
    recordedAt: new Date(now).toISOString(),
  });
}
