import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { AuthStateService } from '@/common/auth';
import { UserEventsPublisher } from '@/common/realtime';
import { MembershipFeeRepository } from '../repositories/membership-fee.repository';

/**
 * Consumer outbox `membership_fee.activated|changed` (idempotent — chỉ ghi đè trạng thái):
 * cập nhật Redis `auth:fee` cho paywall (S-03) + đẩy `membership.updated` tới client.
 */
@Injectable()
export class FeeEventsHandler {
  constructor(
    private readonly state: AuthStateService,
    private readonly events: UserEventsPublisher,
    private readonly fees: MembershipFeeRepository,
  ) {}

  async handle(p: OutboxPayload<'membership_fee.activated'>): Promise<void> {
    // D-120: a delayed/replayed appointment must not restore exemption after revocation.
    // Reload only on fee events, never on each REST/socket request (S-03).
    const current = await this.fees.findCurrent(p.userId);
    if (!current) return;
    const fee = { status: current.status, validUntil: current.validUntil?.toISOString() ?? null };
    await this.state.setFee(p.userId, fee);
    await this.events.publish(p.userId, 'membership.updated', fee);
  }
}
