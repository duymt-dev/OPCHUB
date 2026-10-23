import { Inject, Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import { type AdminServiceComment, type CsvFile, type StaffMember } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { ADMIN_DIRECTORY_PORT, type AdminDirectoryPort } from '@/common/auth';
import { notFound } from '@/common/errors';
import { sanitizeRichHtml } from '@/common/html/sanitize';
import { toCsv } from '@/common/http/csv';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { REQUEST_SELECT, type RequestRow, toRequest } from '../service.mapper';

export interface Actor {
  id: string;
  ip: string | null;
}
const NOT_FOUND = 'Không tìm thấy phiếu yêu cầu';
const VN_DATE = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Admin phiếu YC (D-61 → D-65): danh sách, ghi chú nội bộ @nhắc, xuất CSV; D-72 không trạng thái/phụ trách */
@Injectable()
export class ServiceAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(ADMIN_DIRECTORY_PORT) private readonly admins: AdminDirectoryPort,
  ) {}

  /** Deferred join: trang mã phiếu (idx created_at, code) → đọc đủ cột */
  async page(q: {
    q?: string | undefined;
    page: number;
    size: number;
  }) {
    const where: Prisma.ServiceRequestWhereInput = {
      ...(q.q
        ? {
            OR: [
              { code: { contains: q.q, mode: 'insensitive' } },
              { fullName: { contains: q.q, mode: 'insensitive' } },
              { organization: { contains: q.q, mode: 'insensitive' } },
              { email: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [codes, total] = await Promise.all([
      this.prisma.db.serviceRequest.findMany({
        where,
        select: { code: true },
        orderBy: [{ createdAt: 'desc' }, { code: 'desc' }],
        skip: (q.page - 1) * q.size,
        take: q.size,
      }),
      this.prisma.db.serviceRequest.count({ where }),
    ]);
    const rows = await this.prisma.db.serviceRequest.findMany({
      where: { code: { in: codes.map((c) => c.code) } },
      select: REQUEST_SELECT,
    });
    const by = new Map(rows.map((r) => [r.code, r]));
    const items = codes.flatMap(({ code }) => {
      const r = by.get(code);
      return r ? [toRequest(r)] : [];
    });
    return { items, page: q.page, size: q.size, total };
  }

  /** Người gắn tên được = TK quản trị có `services.action` theo ma trận hiện hành (Q-B46-1, Q-V4-605-1) */
  staff(): Promise<StaffMember[]> {
    return this.admins.withPermission('services.action');
  }

  async comments(code: string): Promise<AdminServiceComment[]> {
    const req = await this.prisma.db.serviceRequest.findUnique({
      where: { code },
      select: {
        comments: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, authorName: true, body: true, mentions: true, createdAt: true },
        },
      },
    });
    if (!req) throw notFound(NOT_FOUND);
    return req.comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }));
  }

  /** Bình luận nội bộ: tác giả = người gọi; @nhắc → outbox `service_request.mentioned` (thông báo) */
  async comment(
    actor: Actor,
    code: string,
    body: string,
    mentions: string[],
  ): Promise<AdminServiceComment> {
    const [names0, staff] = await Promise.all([this.admins.namesOf([actor.id]), this.staff()]);
    const me = { fullName: names0.get(actor.id) ?? 'Quản trị viên' };
    const names = [...new Set(mentions)];
    // Tên có thể trùng: nhắc theo tên → mọi nhân sự cùng tên, trần 10 người (schema outbox)
    const userIds = staff
      .filter((s) => names.includes(s.name) && s.id !== actor.id)
      .map((s) => s.id)
      .slice(0, 10);
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const exists = await tx.serviceRequest.findUnique({
        where: { code },
        select: { code: true },
      });
      if (!exists) throw notFound(NOT_FOUND);
      const c = await tx.serviceRequestComment.create({
        data: {
          requestCode: code,
          authorId: actor.id,
          authorName: me.fullName,
          body: sanitizeRichHtml(body),
          mentions: names,
        },
        select: { id: true, authorName: true, body: true, mentions: true, createdAt: true },
      });
      if (userIds.length) {
        await this.outbox.add(tx, 'service_request.mentioned', {
          code,
          commentId: c.id,
          userIds,
          by: me.fullName,
        });
      }
      await this.log(tx, actor, 'service_request.comment', code, `bình luận phiếu ${code}`);
      return { ...c, createdAt: c.createdAt.toISOString() };
    });
  }

  /**
   * CSV mọi phiếu như prototype (đồng bộ — Q-B43-1); đọc + audit trong CÙNG transaction
   * (BUG-039, luật 10): audit lỗi → không trả CSV.
   */
  async exportCsv(actor: Actor): Promise<CsvFile> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const rows = await tx.serviceRequest.findMany({
        select: REQUEST_SELECT,
        orderBy: [{ createdAt: 'desc' }, { code: 'desc' }],
        take: 10_000,
      });
      await this.log(
        tx,
        actor,
        'service_request.export',
        'service_requests',
        `xuất ${rows.length} phiếu yêu cầu dịch vụ`,
      );
      return { filename: 'yeu-cau-dich-vu.csv', csv: requestsCsv(rows) };
    });
  }

  log(tx: DbTx, actor: Actor, action: string, id: string, summary: string) {
    return this.audit.log(tx, {
      actorId: actor.id,
      action,
      entity: 'service_request',
      entityId: id,
      tag: 'content',
      summary,
      ip: actor.ip,
    });
  }
}

const REQUEST_CSV_HEAD = [
  'Mã',
  'Ngày gửi',
  'Dịch vụ',
  'Đối tượng',
  'Người liên hệ',
  'SĐT',
  'Email',
  'Tổ chức',
  'MST',
  'Tỉnh thành',
  'Mô tả',
];

const requestsCsv = (rows: readonly RequestRow[]): string =>
  toCsv(
    REQUEST_CSV_HEAD,
    rows.map((r) => [
      r.code,
      VN_DATE.format(r.createdAt),
      r.service.name,
      r.requesterType === 'business' ? 'Doanh nghiệp / Tổ chức' : 'Cá nhân',
      r.fullName,
      r.phone,
      r.email,
      r.organization,
      r.taxCode,
      r.address,
      r.note,
    ]),
  );
