import { Module } from '@nestjs/common';
import { CoreModule } from '@/common/core.module';
import { AccountCoreModule } from '@/modules/account';
import { AdminAccountCoreModule } from '@/modules/admin-account';
import { CommunityCoreModule } from '@/modules/community';
import { EventCoreModule } from '@/modules/event';
import { MailCoreModule } from '@/modules/mail';
import { ExportCoreModule } from '@/modules/export';
import { InvestorCoreModule } from '@/modules/investor';
import { MarketingCoreModule } from '@/modules/marketing';
import { MembershipFeeCoreModule } from '@/modules/membership-fee';
import { ModerationCoreModule } from '@/modules/moderation';
import { ReportingCoreModule } from '@/modules/reporting';
import { NotificationCoreModule } from '@/modules/notification';
import { SettingsCoreModule } from '@/modules/settings';
import { UploadsCoreModule } from '@/modules/uploads';
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
import { InvestorProcessor } from './processors/investor.processor';
import { EventProcessor } from './processors/event.processor';

/** Process BullMQ worker — processor thêm theo từng TIP (chỉ thêm dòng) */
@Module({
  imports: [
    CoreModule,
    SettingsCoreModule,
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
    InvestorCoreModule,
    EventCoreModule,
  ],
  providers: [
    OutboxRelayProcessor,
    MailProcessor,
    FeeProcessor,
    CommunityProcessor,
    ModerationProcessor,
    NotificationProcessor,
    MarketingProcessor,
    ExportProcessor,
    StatsProcessor,
    MediaBackfillProcessor,
    HtmlBackfillService,
    HtmlBackfillProcessor,
    AccountProcessor,
    InvestorProcessor,
    EventProcessor,
  ],
})
export class WorkerAppModule {}
