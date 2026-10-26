import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { VIOLATION_WINDOW_DAYS } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

type Db = DbTx | PrismaService['db'];

/**
 * Vi phạm kiểm duyệt (V4-612, D-77, D-83): một dòng / ca (UQ report_id). Đếm = chưa khôi phục
 * và trong 90 ngày — idx partial `moderation_violations_active (user_id, at DESC) WHERE revoked_at IS NULL`.
 */
@Injectable()
export class ViolationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Ẩn tin (có điều kiện) — trả true nếu lần này mới ẩn */
  async hideMessage(tx: DbTx, messageId: string, at: Date): Promise<boolean> {
    const r = await tx.message.updateMany({
      where: { id: messageId, hiddenAt: null, deletedAt: null },
      data: { hiddenAt: at },
    });
    return r.count === 1;
  }

  async showMessage(tx: DbTx, messageId: string): Promise<boolean> {
    const r = await tx.message.updateMany({
      where: { id: messageId, hiddenAt: { not: null }, deletedAt: null },
      data: { hiddenAt: null },
    });
    return r.count === 1;
  }

  /** Tin đã có vi phạm còn hiệu lực chưa (một tin tối đa một vi phạm) */
  async messageCounted(tx: DbTx, messageId: string): Promise<boolean> {
    const n = await tx.moderationViolation.count({ where: { messageId, revokedAt: null } });
    return n > 0;
  }

  /** Ghi vi phạm cho ca — UQ report_id nên job / báo lặp lại không nhân bản */
  async add(
    tx: DbTx,
    v: { userId: string; reportId: string; messageId: string; at: Date },
  ): Promise<boolean> {
    const rows = await tx.$queryRaw<{ ok: number }[]>`
      INSERT INTO moderation_violations (id, user_id, report_id, message_id, at)
      VALUES (gen_random_uuid()::text, ${v.userId}, ${v.reportId}, ${v.messageId}, ${v.at})
      ON CONFLICT (report_id) DO NOTHING RETURNING 1 AS ok`;
    return rows.length === 1;
  }

  /** Khôi phục: bỏ tính mọi vi phạm của tin (một ca / tin còn hiệu lực) */
  async revokeByMessage(tx: DbTx, messageId: string, at: Date): Promise<number> {
    const r = await tx.moderationViolation.updateMany({
      where: { messageId, revokedAt: null },
      data: { revokedAt: at },
    });
    return r.count;
  }

  async count(db: Db, userId: string, now: Date): Promise<number> {
    const rows = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM moderation_violations
      WHERE user_id = ${userId} AND revoked_at IS NULL
        AND at > ${now}::timestamptz - make_interval(days => ${VIOLATION_WINDOW_DAYS})`;
    return rows[0]?.n ?? 0;
  }

  /** Đếm cho cả trang Admin trong một query (không N+1) */
  async counts(userIds: readonly string[], now: Date): Promise<Map<string, number>> {
    if (!userIds.length) return new Map();
    const rows = await this.prisma.db.$queryRaw<{ user_id: string; n: number }[]>`
      SELECT user_id, count(*)::int AS n FROM moderation_violations
      WHERE user_id = ANY(${[...new Set(userIds)]}::text[]) AND revoked_at IS NULL
        AND at > ${now}::timestamptz - make_interval(days => ${VIOLATION_WINDOW_DAYS})
      GROUP BY user_id`;
    return new Map(rows.map((r) => [r.user_id, r.n]));
  }
}
