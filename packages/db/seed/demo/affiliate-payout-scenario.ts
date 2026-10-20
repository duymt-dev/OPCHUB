import { AFFILIATE_PAYOUT_SCENARIO as scenario } from '@opchub/shared/fixtures';
import type { DbTx } from '../../src/client';

/** All updates seek existing primary/unique keys, no scan, N+1 or new schema/index. */
export async function seedAffiliatePayoutScenario(tx: DbTx): Promise<void> {
  const start = new Date(scenario.paidAt);
  const end = new Date(scenario.validUntil);
  await tx.user.update({
    where: { id: scenario.customerId },
    data: { createdAt: start, emailVerifiedAt: start },
  });
  await tx.membershipFee.update({
    where: { userId: scenario.customerId },
    data: { paidAt: start, validUntil: end, createdAt: start },
  });
  await tx.membershipFeePeriod.update({
    where: { id: `demo-fee-${scenario.customerId}` },
    data: { startsAt: start, endsAt: end, createdAt: start },
  });
  await tx.affiliate.update({ where: { userId: scenario.customerId }, data: { createdAt: start } });
  await tx.referral.update({
    where: { id: scenario.referralId },
    data: { createdAt: start, convertedAt: start, monthKey: scenario.month },
  });
  await tx.commission.update({
    where: { id: scenario.commissionId },
    data: { createdAt: start, monthKey: scenario.month },
  });
  // Historical paidBankSnapshot rows are intentionally untouched.
  await tx.affiliate.update({
    where: { id: scenario.affiliateId },
    data: { bankName: null, bankNo: null, bankHolder: null },
  });
}
