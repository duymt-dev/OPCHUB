import { Module } from '@nestjs/common';
import { CoreModule } from '@/common/core.module';
import { CommunityCoreModule } from '@/modules/community';
import { MailCoreModule } from '@/modules/mail';
import { MembershipFeeCoreModule } from '@/modules/membership-fee';
import { SettingsCoreModule } from '@/modules/settings';
import { FeeProcessor } from './processors/fee.processor';
import { MailProcessor } from './processors/mail.processor';
import { OutboxRelayProcessor } from './processors/outbox-relay.processor';

/** Process BullMQ worker — processor thêm theo từng TIP (chỉ thêm dòng) */
@Module({
  imports: [
    CoreModule,
    SettingsCoreModule,
    MailCoreModule,
    CommunityCoreModule,
    MembershipFeeCoreModule,
  ],
  providers: [OutboxRelayProcessor, MailProcessor, FeeProcessor],
})
export class WorkerAppModule {}
