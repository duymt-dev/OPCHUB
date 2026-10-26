import { Injectable } from '@nestjs/common';
import type { Report, ReportMessageRequest } from '@opchub/shared/api-domains';
import type { AccessClaims } from '@/common/auth';
import { conflict, forbidden, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { toReport } from '../domain/report.mapper';
import { ReportRepository } from '../repositories/report.repository';
import { ViolationRepository } from '../repositories/violation.repository';
import { ViolationService } from './violation.service';

/**
 * Thành viên báo cáo tin (D-43: ẩn danh với chủ nhóm; Admin thấy người báo qua message_flags).
 * V4-612 (D-77): báo cáo / trúng từ khoá → ẩn tin ngay + tính vi phạm trong cùng transaction.
 */
@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportRepository,
    private readonly violations: ViolationService,
    private readonly violationRepo: ViolationRepository,
  ) {}

  async report(user: AccessClaims, messageId: string, body: ReportMessageRequest): Promise<Report> {
    const msg = await this.prisma.db.message.findFirst({
      where: { id: messageId, deletedAt: null, room: { group: { deletedAt: null } } },
      select: { senderId: true, body: true, roomId: true, room: { select: { groupId: true } } },
    });
    if (!msg) throw notFound('Không tìm thấy tin nhắn');
    if (msg.senderId === user.sub) throw forbidden('Không thể báo cáo tin của chính bạn');
    const member = await this.prisma.db.groupMember.findFirst({
      where: { groupId: msg.room.groupId, userId: user.sub, status: 'member' },
      select: { userId: true },
    });
    if (!member) throw forbidden('Chỉ thành viên nhóm mới xem và gửi được tin nhắn');

    const { id, fx } = await this.prisma.db.$transaction(async (tx) => {
      const added = await this.reports.addFlag(
        tx,
        messageId,
        user.sub,
        body.reason,
        body.note ?? null,
      );
      if (!added) throw conflict('Bạn đã báo cáo tin này');
      const reportId = await this.reports.upsertOpenCase(tx, {
        messageId,
        source: 'report',
        reason: body.reason,
        hit: msg.body.slice(0, 40),
        bump: true,
      });
      const effects = await this.violations.hideAndCount(tx, {
        reportId,
        messageId,
        roomId: msg.roomId,
        senderId: msg.senderId,
      });
      return { id: reportId, fx: effects };
    });
    await this.violations.after(fx);
    const row = await this.reports.one(id);
    if (!row) throw notFound('Không tìm thấy báo cáo');
    const n = msg.senderId
      ? await this.violationRepo.count(this.prisma.db, msg.senderId, new Date())
      : 0;
    return toReport(row, n);
  }

  /**
   * Job `moderation.keywordHit` — idempotent (ca mở theo tin + nguồn `auto`; vi phạm UQ theo ca,
   * một tin một vi phạm). Tin đã được Admin khôi phục không bị ẩn lại bởi job chạy lại.
   */
  async keywordHit(messageId: string, hit: string): Promise<void> {
    const msg = await this.prisma.db.message.findFirst({
      where: { id: messageId, deletedAt: null },
      select: { senderId: true, roomId: true },
    });
    if (!msg) return;
    const restored = await this.prisma.db.report.count({
      where: { messageId, action: { in: ['restore', 'dismiss'] } },
    });
    if (restored) return;
    const fx = await this.prisma.db.$transaction(async (tx) => {
      const reportId = await this.reports.upsertOpenCase(tx, {
        messageId,
        source: 'auto',
        reason: 'other',
        hit,
        bump: false,
      });
      return this.violations.hideAndCount(tx, {
        reportId,
        messageId,
        roomId: msg.roomId,
        senderId: msg.senderId,
      });
    });
    await this.violations.after(fx);
  }
}
