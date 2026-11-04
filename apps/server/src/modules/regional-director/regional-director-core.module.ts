import { Module } from '@nestjs/common';
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
  RegionalDirectorRepository,
  RegionalDirectorService,
  RegionalDirectorReadService,
  RegionalDirectorEventsHandler,
];
@Module({
  imports: [
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

@Module({ imports: [RegionalDirectorCoreModule], controllers: [AdminRegionalDirectorsController] })
export class RegionalDirectorHttpModule {}
