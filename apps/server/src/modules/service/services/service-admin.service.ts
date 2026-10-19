import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import { hasPermission, type SystemRole } from '@opchub/shared';
import {
  type AdminServiceComment,
  canTransitionService,
  type CsvFile,
  type ServiceRequest,
  type ServiceRequestState,
  type ServiceRequestSummary,
  SERVICE_REQUEST_STATUSES,
  type StaffMember,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { AuthStateService } from '@/common/auth';
import { conflict, notFound } from '@/common/errors';
import { sanitizeRichHtml } from '@/common/html/sanitize';
import { toCsv } from '@/common/http/csv';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { REQUEST_SELECT, type RequestRow, STATUS_LABEL, toRequest } from '../service.mapper';

export interface Actor {
  id: string;
  ip: string | null;
}
const NOT_FOUND = 'Không tìm thấy phiếu yêu cầu';
const ADMIN_ROLES: SystemRole[] = ['super_admin', 'admin', 'moderator'];
const VN_DATE = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Admin phiếu YC (`n.edit`, D-61 → D-65): danh sách, chuyển trạng thái có điều kiện, phụ trách, bình luận */
@Injectable()
export class ServiceAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly auth: AuthStateService,
  ) {}

  /** Deferred join: trang mã phiếu (idx status, created_at / created_at, code) → đọc đủ cột */
  async page(q: {
    status?: ServiceRequestState | undefined;
    q?: string | undefined;
    page: number;
    size: number;
  }) {
    const where: Prisma.ServiceRequestWhereInput = {
      ...(q.status ? { status: q.status } : {}),
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

  async summary(): Promise<ServiceRequestSummary> {
    const rows = await this.prisma.db.serviceRequest.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(SERVICE_REQUEST_STATUSES.map((s) => [s, 0])) as Record<
      ServiceRequestState,
      number
    >;
    for (const r of rows) byStatus[r.status] = r._count._all;
    return { total: rows.reduce((a, r) => a + r._count._all, 0), byStatus };
  }

  /** Nhân sự = tài khoản quản trị có `n.edit` theo ma trận quyền hiện hành (Q-B46-1) */
  async staff(): Promise<StaffMember[]> {
    const grants = await this.auth.grants();
    const roles = ADMIN_ROLES.filter((r) => hasPermission(r, 'n.edit', grants));
    if (!roles.length) return [];
    const users = await this.prisma.db.user.findMany({
      where: { systemRole: { in: roles }, deletedAt: null, status: 'active' },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
    return users.map((u) => ({ id: u.id, name: u.fullName }));
  }

  async transition(actor: Actor, code: string, from: ServiceRequestState, to: ServiceRequestState) {
    if (!canTransitionService(from, to)) throw conflict('Không thể chuyển sang trạng thái này');
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const r = await tx.serviceRequest.updateMany({
        where: { code, status: from },
        data: { status: to },
      });
      if (r.count === 0) {
        const cur = await tx.serviceRequest.findUnique({ where: { code }, select: { code: true } });
        throw cur ? conflict('Phiếu đã được cập nhật bởi người khác') : notFound(NOT_FOUND);
      }
      await this.log(
        tx,
        actor,
        'service_request.transition',
        code,
        `chuyển phiếu ${code} sang ${STATUS_LABEL[to]}`,
      );
      return this.one(tx, code);
    });
  }

  async assign(actor: Actor, code: string, assignee: string | null): Promise<ServiceRequest> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const r = await tx.serviceRequest.updateMany({ where: { code }, data: { assignee } });
      if (r.count === 0) throw notFound(NOT_FOUND);
      const summary = assignee
        ? `giao phiếu ${code} cho ${assignee}`
        : `bỏ người phụ trách phiếu ${code}`;
      await this.log(tx, actor, 'service_request.assign', code, summary);
      return this.one(tx, code);
    });
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
    const [me, staff] = await Promise.all([
      this.prisma.db.user.findUniqueOrThrow({
        where: { id: actor.id },
        select: { fullName: true },
      }),
      this.staff(),
    ]);
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

  private async one(tx: DbTx, code: string): Promise<ServiceRequest> {
    return toRequest(
      await tx.serviceRequest.findUniqueOrThrow({ where: { code }, select: REQUEST_SELECT }),
    );
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
  'Trạng thái',
  'Phụ trách',
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
      STATUS_LABEL[r.status],
      r.assignee ?? '',
      r.note,
    ]),
  );
