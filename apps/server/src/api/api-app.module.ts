import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@/common/auth';
import { CoreModule } from '@/common/core.module';
import { ThrottleModule } from '@/common/throttle/throttle.module';
import { AccountHttpModule } from '@/modules/account';
import { ChatHttpModule } from '@/modules/chat';
import { CommunityCoreModule, CommunityHttpModule } from '@/modules/community';
import { EventHttpModule } from '@/modules/event';
import { ProjectHttpModule } from '@/modules/project';
import { InvestorHttpModule } from '@/modules/investor';
import { DashboardHttpModule } from '@/modules/dashboard';
import { MailHttpModule } from '@/modules/mail';
import { ExportHttpModule } from '@/modules/export';
import { MarketingHttpModule } from '@/modules/marketing';
import { ReportingHttpModule } from '@/modules/reporting';
import { MembershipFeeHttpModule } from '@/modules/membership-fee';
import { ModerationHttpModule } from '@/modules/moderation';
import { NotificationHttpModule } from '@/modules/notification';
import { SettingsCoreModule, SettingsHttpModule } from '@/modules/settings';
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
    ChatHttpModule,
    ModerationHttpModule,
    NotificationHttpModule,
    AccountHttpModule,
    MailHttpModule,
    UploadsHttpModule,
    EventHttpModule,
    ProjectHttpModule,
    InvestorHttpModule,
    DashboardHttpModule,
    SettingsHttpModule,
    MarketingHttpModule,
    ExportHttpModule,
    ReportingHttpModule,
  ],
  controllers: [HealthController],
})
export class ApiAppModule {}
