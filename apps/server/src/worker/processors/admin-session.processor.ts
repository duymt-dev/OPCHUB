import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { AdminSessionSyncHandler } from '@/modules/admin-account';

@Injectable()
export class AdminSessionProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly sync: AdminSessionSyncHandler,
  ) {}
  onApplicationBootstrap(): void {
    this.relay.register('admin.session_changed', (payload) => this.sync.sync(payload));
  }
}
