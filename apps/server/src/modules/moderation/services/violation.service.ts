import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { AUTO_LOCK_FROM, VIOLATION_LOCK_REASON } from '@opchub/shared/api-domains';
import { OutboxService } from '@/common/outbox';
import { AdminUsersService, type StatusRow } from '@/modules/account';
import { MessageVisibilityService } from '@/modules/chat';
import { ViolationRepository } from '../repositories/violation.repository';
import { ModerationSettingsService } from './moderation-settings.service';

const SYSTEM = { id: null, ip: null } as const;
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

export interface HiddenCase {
  reportId: string;
  messageId: string;
  roomId: string;
  /** null: tin bot / hệ thống — ẩn, không tính vi phạm */
  senderId: string | null;
}

/** Kết quả trong transaction → caller gọi `after` sau commit (Redis, refresh, realtime) */
export interface ViolationEffects {
  messageIds: string[];
  locked: StatusRow[];
  unlocked: StatusRow[];
}

/**
 * Kiểm duyệt §26.6 (V4-612, D-77, D-83). Tin bị báo cáo / trúng từ khoá ẩn ngay và tính một vi phạm
 * (một tin tối đa một vi phạm). Lần 1 cảnh báo; từ lần 2 trong 90 ngày khoá tự động N ngày (cài đặt)
 * qua `AdminUsersService.setStatusTx` (D-55: thu hồi phiên…). Khôi phục tin bỏ tính vi phạm và mở
 * khoá tự động khi còn < 2.
 */
@Injectable()
export class ViolationService {
  constructor(
    private readonly repo: ViolationRepository,
    private readonly users: AdminUsersService,
    private readonly outbox: OutboxService,
    private readonly settings: ModerationSettingsService,
    private readonly visibility: MessageVisibilityService,
  ) {}

  async hideAndCount(tx: DbTx, c: HiddenCase, now = new Date()): Promise<ViolationEffects> {
    const fx: ViolationEffects = { messageIds: [], locked: [], unlocked: [] };
    if (await this.repo.hideMessage(tx, c.messageId, now)) fx.messageIds.push(c.messageId);
    if (!c.senderId || (await this.repo.messageCounted(tx, c.messageId))) return fx;
    const userId = c.senderId;
    if (
      !(await this.repo.add(tx, { userId, reportId: c.reportId, messageId: c.messageId, at: now }))
    )
      return fx;
    const count = await this.repo.count(tx, userId, now);
    if (count >= AUTO_LOCK_FROM) {
      const { autoLockDays } = await this.settings.get(tx);
      fx.locked = await this.users.setStatusTx(
        tx,
        SYSTEM,
        [userId],
        'locked',
        VIOLATION_LOCK_REASON,
        {
          until: addDays(now, autoLockDays),
          kind: 'auto',
        },
      );
    } else {
      await this.outbox.add(tx, 'moderation.warned', {
        userId,
        messageId: c.messageId,
        roomId: c.roomId,
        reportId: c.reportId,
      });
    }
    return fx;
  }

  /**
   * Khôi phục tin: hiện lại nguyên văn, vi phạm của tin không tính; còn < 2 và đang khoá tự động →
   * mở ngay (actor = Admin bấm). Khoá thủ công giữ nguyên.
   */
  async restore(
    tx: DbTx,
    actor: { id: string; ip: string | null },
    c: HiddenCase,
    now = new Date(),
  ): Promise<ViolationEffects> {
    const fx: ViolationEffects = { messageIds: [], locked: [], unlocked: [] };
    if (await this.repo.showMessage(tx, c.messageId)) fx.messageIds.push(c.messageId);
    await this.repo.revokeByMessage(tx, c.messageId, now);
    if (!c.senderId) return fx;
    if ((await this.repo.count(tx, c.senderId, now)) < AUTO_LOCK_FROM) {
      fx.unlocked = await this.users.setStatusTx(tx, actor, [c.senderId], 'active', null, {
        until: null,
        kind: 'auto',
        onlyAuto: true,
      });
    }
    return fx;
  }

  /** Sau commit: Redis + thu hồi refresh khi khoá; `message.updated` cho phòng */
  async after(fx: ViolationEffects, now = new Date()): Promise<void> {
    if (fx.locked.length) await this.users.afterStatus(fx.locked, 'locked', now);
    if (fx.unlocked.length) await this.users.afterStatus(fx.unlocked, 'active', now);
    await this.visibility.publish(fx.messageIds);
  }
}
