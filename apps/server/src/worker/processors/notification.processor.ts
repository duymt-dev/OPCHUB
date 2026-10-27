import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';
import { EventMailHandler, ReceiptMailHandler } from '@/modules/mail';
import { FundraisingNotifyHandler, NotificationEventsHandler } from '@/modules/notification';

/**
 * Consumer outbox → thông báo cá nhân (B25). `membership_fee.activated` đã có handler phí (B14);
 * relay gọi mọi handler đăng ký cho cùng loại sự kiện.
 */
@Injectable()
export class NotificationProcessor implements OnApplicationBootstrap {
  constructor(
    private readonly relay: OutboxRelayService,
    private readonly handler: NotificationEventsHandler,
    private readonly eventMail: EventMailHandler,
    private readonly fundraising: FundraisingNotifyHandler,
    private readonly receipt: ReceiptMailHandler,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('chat.mentioned', (p) => this.handler.chatMentioned(p));
    this.relay.register('group.joined', (p) => this.handler.groupJoined(p));
    this.relay.register('group.members_assigned', (p) => this.handler.membersAssigned(p));
    this.relay.register('group.owner_changed', (p) => this.handler.ownerChanged(p));
    this.relay.register('moderation.warned', (p) => this.handler.warned(p));
    this.relay.register('membership_fee.activated', (p) => this.handler.feeActivated(p));
    // D-113 (F4): email biên nhận phí thành viên / Gói Gọi vốn
    this.relay.register('membership_fee.confirmed', (p) => this.receipt.feeConfirmed(p));
    this.relay.register('fundraising.paid', (p) => this.receipt.fundraisingPaid(p));
    this.relay.register('membership_fee.reminded', (p) => this.handler.feeReminded(p));
    this.relay.register('event.registered', (p) => this.handler.eventRegistered(p));
    this.relay.register('event.registered', (p) => this.eventMail.registered(p));
    this.relay.register('fundraising.paid', (p) => this.fundraising.paid(p));
    this.relay.register('fundraising.reviewed', (p) => this.fundraising.reviewed(p));
    this.relay.register('fundraising.reminded', (p) => this.fundraising.reminded(p));
    this.relay.register('service_request.mentioned', (p) => this.handler.serviceMentioned(p));
  }
}
