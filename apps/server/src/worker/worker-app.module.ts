import { Module } from '@nestjs/common';
import { CoreModule } from '@/common/core.module';
import { MailCoreModule } from '@/modules/mail';
import { SettingsCoreModule } from '@/modules/settings';
import { MailProcessor } from './processors/mail.processor';
import { OutboxRelayProcessor } from './processors/outbox-relay.processor';

/** Process BullMQ worker — processor thêm theo từng TIP (chỉ thêm dòng) */
@Module({
  imports: [CoreModule, SettingsCoreModule, MailCoreModule],
  providers: [OutboxRelayProcessor, MailProcessor],
})
export class WorkerAppModule {}
