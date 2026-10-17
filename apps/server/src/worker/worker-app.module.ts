import { Module } from '@nestjs/common';
import { CoreModule } from '@/common/core.module';
import { CommunityCoreModule } from '@/modules/community';
import { MailCoreModule } from '@/modules/mail';
import { MarketingCoreModule } from '@/modules/marketing';
import { MembershipFeeCoreModule } from '@/modules/membership-fee';
import { ModerationCoreModule } from '@/modules/moderation';
import { NotificationCoreModule } from '@/modules/notification';
import { SettingsCoreModule } from '@/modules/settings';
import { CommunityProcessor } from './processors/community.processor';
import { FeeProcessor } from './processors/fee.processor';
import { MailProcessor } from './processors/mail.processor';
import { MarketingProcessor } from './processors/marketing.processor';
import { ModerationProcessor } from './processors/moderation.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { OutboxRelayProcessor } from './processors/outbox-relay.processor';

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
  ],
  providers: [
    OutboxRelayProcessor,
    MailProcessor,
    FeeProcessor,
    CommunityProcessor,
    ModerationProcessor,
    NotificationProcessor,
    MarketingProcessor,
  ],
})
export class WorkerAppModule {}
