import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@/common/auth';
import { CoreModule } from '@/common/core.module';
import { ThrottleModule } from '@/common/throttle/throttle.module';
import { AccountHttpModule } from '@/modules/account';
import { CommunityCoreModule } from '@/modules/community';
import { MailHttpModule } from '@/modules/mail';
import { MembershipFeeCoreModule } from '@/modules/membership-fee';
import { SettingsCoreModule } from '@/modules/settings';
import { HealthController } from './health.controller';

/** Process REST `/v1` — import `<Domain>HttpModule` (chỉ thêm dòng) */
@Module({
  imports: [
    CoreModule,
    ThrottleModule,
    AuthGuardsModule,
    SettingsCoreModule,
    MembershipFeeCoreModule,
    CommunityCoreModule,
    AccountHttpModule,
    MailHttpModule,
  ],
  controllers: [HealthController],
})
export class ApiAppModule {}
