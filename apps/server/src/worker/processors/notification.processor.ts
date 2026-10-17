import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { NotificationEventsHandler } from '@/modules/notification';

/**
 * Consumer outbox → thông báo cá nhân (B25). `membership_fee.activated` đã có handler phí (B14);
 * relay gọi mọi handler đăng ký cho cùng loại sự kiện.
 */
@Injectable()
export class NotificationProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly handler: NotificationEventsHandler,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('chat.mentioned', (p) => this.handler.chatMentioned(p));
    this.relay.register('group.request_decided', (p) => this.handler.joinDecided(p));
    this.relay.register('moderation.warned', (p) => this.handler.warned(p));
    this.relay.register('membership_fee.activated', (p) => this.handler.feeActivated(p));
  }
}
