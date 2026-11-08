import { MyRegionService } from './services/my-region.service';
import { RegionalLockEffects } from './services/regional-lock.effects';
import { RegionalPayeeBankService } from './services/regional-payee-bank.service';
import { RegionalPayeeBankRepository } from './repositories/regional-payee-bank.repository';
import { AdminRegionalPayeeBankController } from './controllers/admin-regional-payee-bank.controller';
import { MeRegionalController } from './controllers/me-regional.controller';
import { Module } from '@nestjs/common';
import { AffiliateCoreModule } from '@/modules/affiliate';
import { AdminRegionalSharesController } from './controllers/admin-regional-shares.controller';
import { RegionalShareRepository } from './repositories/regional-share.repository';
import { RegionalPayoutRepository } from './repositories/regional-payout.repository';
import { RegionalShareSummaryRepository } from './repositories/regional-share-summary.repository';
import { RegionalShareLedgerService } from './services/regional-share-ledger.service';
import { RegionalShareEventsHandler } from './services/regional-share-events.handler';
import { RegionalShareReadService } from './services/regional-share-read.service';
import { RegionalPayoutService } from './services/regional-payout.service';
import { AccountCoreModule } from '@/modules/account';
import { MembershipFeeCoreModule } from '@/modules/membership-fee';
import { MailCoreModule } from '@/modules/mail';
import { NotificationCoreModule } from '@/modules/notification';
import { RegionalProjectionModule } from '@/modules/reporting';
import { AdminRegionalDirectorsController } from './controllers/admin-regional-directors.controller';
import { RegionalDirectorRepository } from './repositories/regional-director.repository';
import { RegionalDirectorService } from './services/regional-director.service';
import { RegionalDirectorReadService } from './services/regional-director-read.service';
import { RegionalDirectorEventsHandler } from './services/regional-director-events.handler';

const providers = [
  RegionalLockEffects,
  RegionalPayeeBankService,
  RegionalPayeeBankRepository,
  MyRegionService,
  RegionalShareRepository,
  RegionalPayoutRepository,
  RegionalShareSummaryRepository,
  RegionalShareLedgerService,
  RegionalShareEventsHandler,
  RegionalShareReadService,
  RegionalPayoutService,
  RegionalDirectorRepository,
  RegionalDirectorService,
  RegionalDirectorReadService,
  RegionalDirectorEventsHandler,
];
@Module({
  imports: [
    AffiliateCoreModule,
    AccountCoreModule,
    MembershipFeeCoreModule,
    MailCoreModule,
    NotificationCoreModule,
    RegionalProjectionModule,
  ],
  providers,
  exports: providers,
})
export class RegionalDirectorCoreModule {}

@Module({
  imports: [RegionalDirectorCoreModule],
  controllers: [
    AdminRegionalPayeeBankController,
    MeRegionalController,
    AdminRegionalDirectorsController,
    AdminRegionalSharesController,
  ],
})
export class RegionalDirectorHttpModule {}
