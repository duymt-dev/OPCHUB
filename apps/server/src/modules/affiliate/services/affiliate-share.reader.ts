import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { CommissionRepository } from '../repositories/commission.repository';
import { PolicyRepository } from '../repositories/policy.repository';

/** Read-only public boundary, intentionally does not lock affiliate/referral writers. */
@Injectable()
export class AffiliateShareReader {
  constructor(
    private readonly referrals: CommissionRepository,
    private readonly policy: PolicyRepository,
  ) {}
  referrerOf(tx: DbTx, customerId: string) {
    return this.referrals.referrerForShare(tx, customerId);
  }
  policyAt(tx: DbTx) {
    return this.policy.get(tx);
  }
}
