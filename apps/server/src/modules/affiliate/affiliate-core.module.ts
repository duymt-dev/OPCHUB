import { Module } from '@nestjs/common';
import { AccountCoreModule } from '../account';
import { MembershipFeeCoreModule } from '../membership-fee';
import { NotificationCoreModule } from '../notification';
import { AffiliateRepository } from './repositories/affiliate.repository';
import { CommissionRepository } from './repositories/commission.repository';
import { AffiliateLifecycleHandler } from './services/affiliate-lifecycle.handler';
import { AffiliateNotifyHandler } from './services/affiliate-notify.handler';
import { AffiliateAllocationRepository } from './repositories/affiliate-allocation.repository';
import { AffiliateAllocationService } from './services/affiliate-allocation.service';
import { AffiliateBackfillService } from './services/affiliate-backfill.service';
import { ReferralRepository } from './repositories/referral.repository';
import { ReferralCodeService } from './services/referral-code.service';
import { ReferralPublicController } from './controllers/referral-public.controller';
import { MeAffiliateRepository } from './repositories/me-affiliate.repository';
import { PolicyRepository } from './repositories/policy.repository';
import { MeAffiliateService } from './services/me-affiliate.service';
import { MeAffiliateController } from './controllers/me-affiliate.controller';

const services = [
  MeAffiliateRepository,
  PolicyRepository,
  MeAffiliateService,
  ReferralRepository,
  ReferralCodeService,
  AffiliateAllocationRepository,
  AffiliateAllocationService,
  AffiliateBackfillService,
  AffiliateRepository,
  CommissionRepository,
  AffiliateLifecycleHandler,
  AffiliateNotifyHandler,
];

/** Affiliate §20: đại lý, referral, hoa hồng (TIP-V2-401) */
@Module({
  imports: [AccountCoreModule, MembershipFeeCoreModule, NotificationCoreModule],
  providers: services,
  exports: services,
})
export class AffiliateCoreModule {}

@Module({
  imports: [AffiliateCoreModule],
  controllers: [ReferralPublicController, MeAffiliateController],
})
export class AffiliateHttpModule {}
