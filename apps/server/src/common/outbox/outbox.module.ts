import { Global, Module } from '@nestjs/common';
import { OutboxRelayService } from './outbox-relay.service';
import { OutboxRepository } from './outbox.repository';
import { OutboxService } from './outbox.service';

/** OutboxService (ghi) cho mọi process; relay chỉ được gọi từ worker */
@Global()
@Module({
  providers: [OutboxService, OutboxRepository, OutboxRelayService],
  exports: [OutboxService, OutboxRelayService],
})
export class OutboxModule {}
