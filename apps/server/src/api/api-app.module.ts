import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@/common/auth';
import { CoreModule } from '@/common/core.module';
import { ThrottleModule } from '@/common/throttle/throttle.module';
import { AccountHttpModule } from '@/modules/account';
import { CommunityCoreModule, CommunityHttpModule } from '@/modules/community';
import { MailHttpModule } from '@/modules/mail';
import { MembershipFeeHttpModule } from '@/modules/membership-fee';
import { SettingsCoreModule } from '@/modules/settings';
import { UploadsHttpModule } from '@/modules/uploads';
import { HealthController } from './health.controller';

/** Process REST `/v1` — import `<Domain>HttpModule` (chỉ thêm dòng) */
@Module({
  imports: [
    CoreModule,
    ThrottleModule,
    AuthGuardsModule,
    SettingsCoreModule,
    MembershipFeeHttpModule,
    CommunityCoreModule,
    CommunityHttpModule,
    AccountHttpModule,
    MailHttpModule,
    UploadsHttpModule,
  ],
  controllers: [HealthController],
})
export class ApiAppModule {}
