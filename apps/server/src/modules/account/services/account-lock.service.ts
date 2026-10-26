import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AdminUsersRepository } from '../repositories/admin-users.repository';
import { AdminUsersService } from './admin-users.service';

const BATCH = 500;
const SYSTEM = { id: null, ip: null } as const;

/**
 * V4-612 (§26.6 "Tự mở khóa", D-77): TK khoá có hạn hết hạn → mở, qua cùng đường `setStatusTx`
 * (outbox `user.unlocked`, audit `user.unlock` actor hệ thống, Redis). Gọi từ job định kỳ và khi
 * đăng nhập / làm mới phiên (`unlockIfExpired`).
 */
@Injectable()
export class AccountLockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AdminUsersRepository,
    private readonly users: AdminUsersService,
  ) {}

  /** Job `moderation-auto-unlock`: theo lô 500 tới hết; trả số TK đã mở */
  async sweepExpired(now = new Date()): Promise<number> {
    let total = 0;
    for (;;) {
      const ids = (await this.repo.expiredLocks(now, BATCH)).map((r) => r.id);
      if (!ids.length) return total;
      total += await this.unlock(ids, now);
      if (ids.length < BATCH) return total;
    }
  }

  /** Đăng nhập: TK đang khoá có `lockedUntil <= now` → mở ngay; trả true nếu đã mở */
  async unlockIfExpired(
    user: { id: string; status: string; lockedUntil: Date | null },
    now = new Date(),
  ): Promise<boolean> {
    if (user.status !== 'locked' || !user.lockedUntil || user.lockedUntil > now) return false;
    return (await this.unlock([user.id], now)) > 0;
  }

  private async unlock(ids: readonly string[], now: Date): Promise<number> {
    const rows = await this.prisma.db.$transaction((tx) =>
      this.users.setStatusTx(tx, SYSTEM, ids, 'active', null, {
        until: null,
        kind: 'auto',
        expiredAt: now,
      }),
    );
    await this.users.afterStatus(rows, 'active', now);
    return rows.length;
  }
}
