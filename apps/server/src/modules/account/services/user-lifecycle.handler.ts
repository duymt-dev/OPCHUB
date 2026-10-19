import { Injectable, Logger } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { PresenceService, UserEventsPublisher } from '@/common/realtime';
import { LockEffectsRegistry } from './lock-effects.registry';

/**
 * Consumer outbox vòng đời TK (NA-16, NA-28, QT-02, D-55) — mọi hàm idempotent:
 * - `user.session_revoked` → `session.revoked` vào `user:{id}` (socket process emit rồi ngắt);
 *   khoá thì bỏ khỏi `presence:users` ngay (không chờ hết hạn 90 s).
 * - `user.role_changed` → `session.revoked {role_changed}`: client refresh lấy quyền mới.
 * - `user.locked` / `user.unlocked` → các provider `LockEffectsRegistry` (nhóm làm chủ → Admin…).
 * Dự án Public tự ẩn qua `visibleTo` (owner.status) nên không cần hiệu ứng ở đây.
 */
@Injectable()
export class UserLifecycleHandler {
  private readonly logger = new Logger(UserLifecycleHandler.name);

  constructor(
    private readonly events: UserEventsPublisher,
    private readonly presence: PresenceService,
    private readonly effects: LockEffectsRegistry,
  ) {}

  async sessionRevoked(p: OutboxPayload<'user.session_revoked'>): Promise<void> {
    await this.events.publish(p.userId, 'session.revoked', { reason: p.reason });
    if (p.reason === 'locked') await this.presence.forgetUsers([p.userId]);
  }

  async roleChanged(p: OutboxPayload<'user.role_changed'>): Promise<void> {
    await this.events.publish(p.userId, 'session.revoked', { reason: 'role_changed' });
  }

  async locked(p: OutboxPayload<'user.locked'>): Promise<void> {
    await this.effects.locked([p.userId]);
  }

  async unlocked(p: OutboxPayload<'user.unlocked'>): Promise<void> {
    await this.effects.unlocked([p.userId]);
    this.logger.debug({ userId: p.userId }, 'Mở khoá TK — dự án tự hiện lại, nhóm không trả lại');
  }
}
