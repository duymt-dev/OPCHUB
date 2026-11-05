import { SearchModule } from '@/modules/search';
import { Module } from '@nestjs/common';
import { RegionalDirectorHttpModule } from '@/modules/regional-director';
import { AuthGuardsModule } from '@/common/auth';
import { CoreModule } from '@/common/core.module';
import { whenFeature } from '@/common/feature/feature.module';
import { ThrottleModule } from '@/common/throttle/throttle.module';
import { AccountHttpModule } from '@/modules/account';
import { AffiliateHttpModule } from '@/modules/affiliate';
import { AdminAccountCoreModule, AdminAccountHttpModule } from '@/modules/admin-account';
import { ChatHttpModule } from '@/modules/chat';
import { CommunityCoreModule, CommunityHttpModule } from '@/modules/community';
import { EventHttpModule } from '@/modules/event';
import { ProjectHttpModule } from '@/modules/project';
import { InvestorHttpModule } from '@/modules/investor';
import { LocalBusinessHttpModule } from '@/modules/local-business';
import { OnboardingHttpModule } from '@/modules/onboarding';
import { DashboardHttpModule } from '@/modules/dashboard';
import { MailHttpModule } from '@/modules/mail';
import { ExportHttpModule } from '@/modules/export';
import { MarketingHttpModule } from '@/modules/marketing';
import { ReportingHttpModule } from '@/modules/reporting';
import { BotHttpModule } from '@/modules/bot';
import { ServiceHttpModule } from '@/modules/service';
import { MembershipFeeHttpModule } from '@/modules/membership-fee';
import { ModerationHttpModule } from '@/modules/moderation';
import { NotificationHttpModule } from '@/modules/notification';
import { PricingCoreModule, PricingHttpModule } from '@/modules/pricing';
import { SettingsCoreModule, SettingsHttpModule } from '@/modules/settings';
import { UploadsHttpModule } from '@/modules/uploads';
import { HealthController } from './health.controller';
import { LlmConfigHttpModule } from '@/modules/llm-config';

/** Process REST `/v1` — import `<Domain>HttpModule` (chỉ thêm dòng) */
@Module({
  imports: [
    SearchModule,
    RegionalDirectorHttpModule,
    CoreModule,
    LlmConfigHttpModule,
    ThrottleModule,
    AuthGuardsModule,
    SettingsCoreModule,
    PricingCoreModule,
    PricingHttpModule,
    MembershipFeeHttpModule,
    CommunityCoreModule,
    CommunityHttpModule,
    ChatHttpModule,
    ModerationHttpModule,
    NotificationHttpModule,
    AccountHttpModule,
    AffiliateHttpModule,
    AdminAccountCoreModule,
    AdminAccountHttpModule,
    MailHttpModule,
    UploadsHttpModule,
    EventHttpModule,
    ProjectHttpModule,
    InvestorHttpModule,
    LocalBusinessHttpModule,
    OnboardingHttpModule,
    DashboardHttpModule,
    SettingsHttpModule,
    MarketingHttpModule,
    ExportHttpModule,
    ReportingHttpModule,
    BotHttpModule,
    whenFeature('FEATURE_SERVICES', ServiceHttpModule),
  ],
  controllers: [HealthController],
})
export class ApiAppModule {}
