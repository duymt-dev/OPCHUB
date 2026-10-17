import { Module } from '@nestjs/common';
import { CoreModule } from '@/common/core.module';
import { OutboxRelayProcessor } from './processors/outbox-relay.processor';

/** Process BullMQ worker — processor thêm theo từng TIP (chỉ thêm dòng) */
@Module({
  imports: [CoreModule],
  providers: [OutboxRelayProcessor],
})
export class WorkerAppModule {}
