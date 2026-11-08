import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { UserLifecycleHandler, UserDeletionService } from '@/modules/account';

/**
 * Consumer outbox vòng đời TK (TIP-V2-104, BUG-004, BUG-005): khoá / mở khoá / thu hồi phiên /
 * đổi vai trò → ngắt socket, rời online, chuyển nhóm làm chủ về Admin.
 */
@Injectable()
export class AccountProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly lifecycle: UserLifecycleHandler,
    private readonly deletion: UserDeletionService,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('user.deleted', (p) => this.deletion.effects(p.userId));
    this.relay.register('user.locked', (p) => this.lifecycle.locked(p));
    this.relay.register('user.unlocked', (p) => this.lifecycle.unlocked(p));
    this.relay.register('user.session_revoked', (p) => this.lifecycle.sessionRevoked(p));
  }
}
