import { Module } from '@nestjs/common';
import { AdminSessionProcessor } from './processors/admin-session.processor';
import { PushProcessor } from './processors/push.processor';
import { AiBudgetProcessor } from './processors/ai-budget.processor';
import { AiBudgetNotifyHandler } from '@/modules/llm-config';
import { NeedNotifyProcessor } from './processors/need-notify.processor';
import { RegionalDirectorCoreModule } from '@/modules/regional-director';
import { RegionalDirectorProcessor } from './processors/regional-director.processor';
import { CoreModule } from '@/common/core.module';
import { AccountCoreModule } from '@/modules/account';
import { AffiliateCoreModule } from '@/modules/affiliate';
import { AdminAccountCoreModule } from '@/modules/admin-account';
import { CommunityCoreModule } from '@/modules/community';
import { EventCoreModule } from '@/modules/event';
import { MailCoreModule } from '@/modules/mail';
import { ExportCoreModule } from '@/modules/export';
import { MarketingCoreModule } from '@/modules/marketing';
import { MembershipFeeCoreModule } from '@/modules/membership-fee';
import { ModerationCoreModule } from '@/modules/moderation';
import { ReportingCoreModule } from '@/modules/reporting';
import { NotificationCoreModule } from '@/modules/notification';
import { PricingCoreModule } from '@/modules/pricing';
import { SettingsCoreModule, SettingsAuditModule } from '@/modules/settings';
import { UploadsCoreModule } from '@/modules/uploads';
import { SystemCoreModule } from '@/modules/system';
import { AccountLockProcessor } from './processors/account-lock.processor';
import { AccountProcessor } from './processors/account.processor';
import { CommunityProcessor } from './processors/community.processor';
import { ExportProcessor } from './processors/export.processor';
import { FeeProcessor } from './processors/fee.processor';
import { MailProcessor } from './processors/mail.processor';
import { MarketingProcessor } from './processors/marketing.processor';
import { ModerationProcessor } from './processors/moderation.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { StatsProcessor } from './processors/stats.processor';
import { OutboxRelayProcessor } from './processors/outbox-relay.processor';
import { MediaBackfillProcessor } from './processors/media-backfill.processor';
import { HtmlBackfillService } from '@/common/html/html-backfill.service';
import { HtmlBackfillProcessor } from './processors/html-backfill.processor';
import { EventProcessor } from './processors/event.processor';
import { HousekeepingProcessor } from './processors/housekeeping.processor';
import { AffiliateProcessor } from './processors/affiliate.processor';
import { ChatCoreModule } from '@/modules/chat';
import { BotPublicationProcessor } from './processors/bot-publication.processor';
import { BotCoreModule } from '@/modules/bot';
import { BotProcessor } from './processors/bot.processor';
import { FundraisingPaymentModule, ProjectCoreModule } from '@/modules/project';
import { FundraisingProcessor } from './processors/fundraising.processor';
import { LocalBusinessCoreModule } from '@/modules/local-business';
import { OnboardingCoreModule } from '@/modules/onboarding';
import { StoreProcessor } from './processors/store.processor';
import { OnboardingProcessor } from './processors/onboarding.processor';

/** Process BullMQ worker — processor thêm theo từng TIP (chỉ thêm dòng) */
@Module({
  imports: [
    RegionalDirectorCoreModule,
    CoreModule,
    SettingsCoreModule,
    SettingsAuditModule,
    PricingCoreModule,
    MailCoreModule,
    CommunityCoreModule,
    MembershipFeeCoreModule,
    ModerationCoreModule,
    NotificationCoreModule,
    MarketingCoreModule,
    ExportCoreModule,
    ReportingCoreModule,
    UploadsCoreModule,
    AccountCoreModule,
    AdminAccountCoreModule,
    EventCoreModule,
    SystemCoreModule,
    AffiliateCoreModule,
    ChatCoreModule,
    BotCoreModule,
    ProjectCoreModule,
    LocalBusinessCoreModule,
    OnboardingCoreModule,
    FundraisingPaymentModule,
  ],
  providers: [
    AiBudgetProcessor,
    AiBudgetNotifyHandler,
    PushProcessor,
    NeedNotifyProcessor,
    RegionalDirectorProcessor,
    OutboxRelayProcessor,
    MailProcessor,
    FeeProcessor,
    CommunityProcessor,
    ModerationProcessor,
    AccountLockProcessor,
    NotificationProcessor,
    MarketingProcessor,
    ExportProcessor,
    StatsProcessor,
    MediaBackfillProcessor,
    HtmlBackfillService,
    HtmlBackfillProcessor,
    AccountProcessor,
    AdminSessionProcessor,
    EventProcessor,
    HousekeepingProcessor,
    AffiliateProcessor,
    BotPublicationProcessor,
    BotProcessor,
    FundraisingProcessor,
    StoreProcessor,
    OnboardingProcessor,
  ],
})
export class WorkerAppModule {}
