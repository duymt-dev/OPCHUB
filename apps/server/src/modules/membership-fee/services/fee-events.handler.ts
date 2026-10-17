import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { AuthStateService } from '@/common/auth';
import { UserEventsPublisher } from '@/common/realtime';

/**
 * Consumer outbox `membership_fee.activated|changed` (idempotent — chỉ ghi đè trạng thái):
 * cập nhật Redis `auth:fee` cho paywall (S-03) + đẩy `membership.updated` tới client.
 */
@Injectable()
export class FeeEventsHandler {
  constructor(
    private readonly state: AuthStateService,
    private readonly events: UserEventsPublisher,
  ) {}

  async handle(p: OutboxPayload<'membership_fee.activated'>): Promise<void> {
    await this.state.setFee(p.userId, { status: p.status, validUntil: p.validUntil });
    await this.events.publish(p.userId, 'membership.updated', {
      status: p.status,
      validUntil: p.validUntil,
    });
  }
}
