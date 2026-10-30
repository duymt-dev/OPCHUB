import { AdminAffiliatePolicyController } from './controllers/admin-affiliate-policy.controller';
import { AdminAffiliatesController } from './controllers/admin-affiliates.controller';
import { AdminAffiliateCommissionsController } from './controllers/admin-affiliate-commissions.controller';
import { AffiliateCsvService } from './services/affiliate-csv.service';
import { AffiliateAdminService } from './services/affiliate-admin.service';
import { AffiliateAdminNotifyHandler } from './services/affiliate-admin-notify.handler';
import { AffiliatePolicyService } from './services/affiliate-policy.service';
import { PayoutService } from './services/payout.service';
import { CommissionAdminService } from './services/commission-admin.service';
import { AffiliateAdminRepository } from './repositories/affiliate-admin.repository';
import { CommissionAdminRepository } from './repositories/commission-admin.repository';
import { AffiliateNoticeRepository } from './repositories/affiliate-notice.repository';
import { AffiliateWriteRepository } from './repositories/affiliate-write.repository';
import { Module } from '@nestjs/common';
import { CommunityCoreModule } from '../community';
import { AdminAccountCoreModule } from '../admin-account';
import { MailCoreModule } from '../mail';
import { RegionalDirectorRepository } from './repositories/regional-director.repository';
import { RegionalDirectorService } from './services/regional-director.service';
import { RegionalDirectorReadService } from './services/regional-director-read.service';
import { AdminRegionalDirectorsController } from './controllers/admin-regional-directors.controller';
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

import { FundraisingCommissionHandler } from './services/fundraising-commission.handler';
import { RevenueSharingRepository } from './repositories/revenue-sharing.repository';
import { RevenueCaptureService } from './services/revenue-capture.service';
import { RevenueSharingHandler } from './services/revenue-sharing.handler';
import { RevenuePayoutRepository } from './repositories/revenue-payout.repository';
import { RegionalDirectorBankRepository } from './repositories/regional-director-bank.repository';
import { RevenuePayoutService } from './services/revenue-payout.service';
import { RevenuePayoutNotifyHandler } from './services/revenue-payout-notify.handler';
import { AdminRevenuePayoutsController } from './controllers/admin-revenue-payouts.controller';
import { AdminRevenueLedgerController } from './controllers/admin-revenue-ledger.controller';
import { RevenueLedgerRepository } from './repositories/revenue-ledger.repository';
import { RevenueLedgerService } from './services/revenue-ledger.service';

const services = [
  RevenueLedgerRepository,
  RevenueLedgerService,
  RegionalDirectorBankRepository,
  RevenuePayoutRepository,
  RevenuePayoutService,
  RevenuePayoutNotifyHandler,
  RevenueSharingRepository,
  RevenueCaptureService,
  RevenueSharingHandler,
  RegionalDirectorRepository,
  RegionalDirectorService,
  RegionalDirectorReadService,
  FundraisingCommissionHandler,
  AffiliateWriteRepository,
  AffiliateNoticeRepository,
  CommissionAdminRepository,
  AffiliateAdminRepository,
  CommissionAdminService,
  PayoutService,
  AffiliatePolicyService,
  AffiliateAdminNotifyHandler,
  AffiliateAdminService,
  AffiliateCsvService,
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
  imports: [
    AccountCoreModule,
    MembershipFeeCoreModule,
    NotificationCoreModule,
    CommunityCoreModule,
    AdminAccountCoreModule,
    MailCoreModule,
  ],
  providers: services,
  exports: services,
})
export class AffiliateCoreModule {}

@Module({
  imports: [AffiliateCoreModule],
  controllers: [
    AdminRevenueLedgerController,
    AdminRevenuePayoutsController,
    AdminRegionalDirectorsController,
    ReferralPublicController,
    MeAffiliateController,
    AdminAffiliateCommissionsController,
    AdminAffiliatesController,
    AdminAffiliatePolicyController,
  ],
})
export class AffiliateHttpModule {}
