import { Injectable } from '@nestjs/common';
import type { Report, ReportMessageRequest } from '@opchub/shared/api-domains';
import type { AccessClaims } from '@/common/auth';
import { conflict, forbidden, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { toReport } from '../domain/report.mapper';
import { ReportRepository } from '../repositories/report.repository';

/** Thành viên báo cáo tin (D-43: ẩn danh với chủ nhóm; Admin thấy người báo qua message_flags) */
@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportRepository,
  ) {}

  async report(user: AccessClaims, messageId: string, body: ReportMessageRequest): Promise<Report> {
    const msg = await this.prisma.db.message.findFirst({
      where: { id: messageId, deletedAt: null, room: { group: { deletedAt: null } } },
      select: { senderId: true, body: true, room: { select: { groupId: true } } },
    });
    if (!msg) throw notFound('Không tìm thấy tin nhắn');
    if (msg.senderId === user.sub) throw forbidden('Không thể báo cáo tin của chính bạn');
    const member = await this.prisma.db.groupMember.findFirst({
      where: { groupId: msg.room.groupId, userId: user.sub, status: 'member' },
      select: { userId: true },
    });
    if (!member) throw forbidden('Chỉ thành viên nhóm mới xem và gửi được tin nhắn');

    const id = await this.prisma.db.$transaction(async (tx) => {
      const added = await this.reports.addFlag(
        tx,
        messageId,
        user.sub,
        body.reason,
        body.note ?? null,
      );
      if (!added) throw conflict('Bạn đã báo cáo tin này');
      return this.reports.upsertOpenCase(tx, {
        messageId,
        source: 'report',
        reason: body.reason,
        hit: msg.body.slice(0, 40),
        bump: true,
      });
    });
    const row = await this.reports.one(id);
    if (!row) throw notFound('Không tìm thấy báo cáo');
    return toReport(row);
  }

  /** Job `moderation.keywordHit` — idempotent (ca mở theo tin + nguồn `auto`) */
  async keywordHit(messageId: string, hit: string): Promise<void> {
    const exists = await this.prisma.db.message.count({
      where: { id: messageId, deletedAt: null },
    });
    if (!exists) return;
    await this.prisma.db.$transaction((tx) =>
      this.reports.upsertOpenCase(tx, {
        messageId,
        source: 'auto',
        reason: 'other',
        hit,
        bump: false,
      }),
    );
  }
}
