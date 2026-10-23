import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { FeeReminderMilestone } from '../domain/fee-reminder';

export interface ReminderCandidate {
  user_id: string;
  email: string;
  full_name: string;
  valid_until: Date;
  amount: number;
  /** Mốc đã gửi cho kỳ `valid_until` hiện tại */
  sent: string[];
}

/** Bảng `fee_reminders` (NA-04): mỗi (user, kỳ, mốc) ≤ 1 lần nhờ PK */
@Injectable()
export class FeeReminderRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ứng viên có hạn trong [from, to] (partial idx `membership_fees_remind`), keyset theo user_id,
   * kèm mốc đã gửi của kỳ hiện tại — một query, không lặp.
   */
  candidates(from: Date, to: Date, after: string, limit: number): Promise<ReminderCandidate[]> {
    return this.prisma.db.$queryRaw<ReminderCandidate[]>`
      SELECT f.user_id, u.email::text AS email, u.full_name, f.valid_until, f.amount,
             COALESCE(array_agg(r.milestone) FILTER (WHERE r.milestone IS NOT NULL), '{}') AS sent
      FROM membership_fees f
      JOIN users u ON u.id = f.user_id
      LEFT JOIN fee_reminders r ON r.user_id = f.user_id AND r.valid_until = f.valid_until
      WHERE f.status IN ('active', 'expiring', 'expired')
        AND f.valid_until BETWEEN ${from} AND ${to}
        AND f.user_id > ${after}
        AND u.status = 'active' AND u.deleted_at IS NULL AND u.account_type <> 'investor'
      GROUP BY f.user_id, u.email, u.full_name, f.valid_until, f.amount
      ORDER BY f.user_id
      LIMIT ${limit}`;
  }

  /** Ghi mốc; chỉ trả về người vừa ghi thật (ON CONFLICT) — hai worker chạy song song không gửi trùng */
  async claim(
    tx: DbTx,
    items: readonly { userId: string; validUntil: Date; milestone: FeeReminderMilestone }[],
  ): Promise<{ userId: string; milestone: FeeReminderMilestone }[]> {
    if (!items.length) return [];
    return tx.$queryRaw<{ userId: string; milestone: FeeReminderMilestone }[]>`
      INSERT INTO fee_reminders (user_id, valid_until, milestone)
      SELECT * FROM unnest(
        ${items.map((i) => i.userId)}::text[],
        ${items.map((i) => i.validUntil)}::timestamptz[],
        ${items.map((i) => i.milestone)}::text[])
      ON CONFLICT DO NOTHING
      RETURNING user_id AS "userId", milestone`;
  }
}
