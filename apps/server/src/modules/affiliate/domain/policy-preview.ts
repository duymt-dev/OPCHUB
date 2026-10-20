import type { AffiliateAdminPolicyPreview } from '@opchub/shared/api-domains';
import { commissionAmount } from './commission-amount';

// SRS fixed annual list price; also membership-fee.prisma amount @default(600000).
// A historical fee/balance must never stand in for the current list price.
const ANNUAL_LIST_AMOUNT = 600_000;

export function policyPreview(rate: number): AffiliateAdminPolicyPreview {
  return {
    rate,
    feeAmount: ANNUAL_LIST_AMOUNT,
    commission: commissionAmount(ANNUAL_LIST_AMOUNT, rate),
  };
}
