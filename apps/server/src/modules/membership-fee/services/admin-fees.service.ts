import { Injectable } from '@nestjs/common';
import type { MembershipFeeStatus } from '@opchub/shared';
import type { FeeAction, FeeExport, FeeRow, FeeSummary } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { esc, MailService } from '../../mail';
import { localPhone } from '../domain/fee-period';
import { AdminFeesRepository, type FeeListRow } from '../repositories/admin-fees.repository';
import { MembershipFeeService } from './membership-fee.service';

export interface FeeActor {
  id: string;
  ip: string | null;
}

/** Q-B15-1: thu tay bắt buộc lý do (CHECK DB, D-41) — hợp đồng FE chưa gửi lý do */
export const DEFAULT_COLLECT_REASON = 'Admin ghi nhận đã thu';
const FEE_AMOUNT = 600_000;

const toRow = (r: FeeListRow): FeeRow => ({
  userId: r.user_id,
  memberCode: r.member_code,
  fullName: r.full_name,
  email: r.email,
  phone: localPhone(r.phone),
  accountType: r.account_type,
  joinedAt: r.created_at.toISOString(),
  status: r.status,
  paidAt: r.paid_at?.toISOString() ?? null,
  validUntil: r.valid_until?.toISOString() ?? null,
  amount: r.amount,
});

const STATUS_LABEL: Record<MembershipFeeStatus, string> = {
  pending_payment: 'Chờ thanh toán',
  active: 'Đang hiệu lực',
  expiring: 'Sắp hết hạn',
  expired: 'Hết hạn',
};
const vnDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
      })
    : '—';
const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
const BOM = String.fromCharCode(0xfeff);

/** Màn Phí thành viên — mọi thao tác ghi → audit_logs cùng transaction (luật 10) */
@Injectable()
export class AdminFeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AdminFeesRepository,
    private readonly fees: MembershipFeeService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async page(
    status: MembershipFeeStatus | undefined,
    q: string | undefined,
    page: number,
    size: number,
  ) {
    const { rows, total } = await this.repo.page(
      status,
      q?.trim() || undefined,
      size,
      (page - 1) * size,
    );
    return { items: rows.map(toRow), page, size, total };
  }

  async summary(): Promise<FeeSummary> {
    const { counts, revenue } = await this.repo.summary();
    const n = (s: MembershipFeeStatus) => counts.get(s) ?? 0;
    return {
      total: [...counts.values()].reduce((a, b) => a + b, 0),
      active: n('active'),
      pending_payment: n('pending_payment'),
      expiring: n('expiring'),
      expired: n('expired'),
      paid: n('active') + n('expiring'),
      revenue,
      feeAmount: FEE_AMOUNT,
    };
  }

  async row(userId: string): Promise<FeeRow> {
    const [r] = await this.repo.byUserIds([userId]);
    if (!r || r.account_type === 'investor') throw notFound('Không tìm thấy thành viên');
    return toRow(r);
  }

  /** Thao tác một dòng: collect / renew (thu tay, kỳ `manual`, BR-05) hoặc remind (gửi mail) */
  async action(
    actor: FeeActor,
    userId: string,
    action: FeeAction,
    now = new Date(),
  ): Promise<FeeRow> {
    const cur = await this.row(userId);
    if (action === 'remind') {
      await this.remind(actor, [userId]);
      return cur;
    }
    await this.collect(actor, [userId], now);
    return this.row(userId);
  }

  /**
   * Ghi nhận đã thu hàng loạt — mỗi người một transaction có khoá dòng + version (rule 8), nên
   * xử lý tuần tự có chủ đích; danh sách ≤ 100 (idListSchema + trang Admin). Một người lỗi
   * (vd. sai trạng thái) không chặn người khác.
   */
  async collect(actor: FeeActor, userIds: readonly string[], now = new Date()): Promise<number> {
    const rows = await this.repo.byUserIds([...new Set(userIds)]);
    let updated = 0;
    for (const r of rows.filter((x) => x.account_type !== 'investor')) {
      await this.prisma.db.$transaction(async (tx) => {
        const until = await this.fees.activate(
          tx,
          {
            userId: r.user_id,
            amount: r.amount,
            source: 'manual',
            collectedBy: actor.id,
            reason: DEFAULT_COLLECT_REASON,
          },
          now,
        );
        await this.audit.log(tx, {
          actorId: actor.id,
          action: 'fee.collect',
          entity: 'membership_fee',
          entityId: r.user_id,
          tag: 'member',
          summary: `Ghi nhận thu ${r.amount.toLocaleString('vi-VN')}đ · ${r.full_name}`,
          diff: { validUntil: until.toISOString(), reason: DEFAULT_COLLECT_REASON },
          ip: actor.ip,
        });
      });
      updated += 1;
    }
    return updated;
  }

  /** Nhắc đóng phí: một mail `fee_reminder` mỗi người (qua outbox), audit một dòng */
  async remind(actor: FeeActor, userIds: readonly string[] | 'all'): Promise<number> {
    const targets =
      userIds === 'all'
        ? await this.repo.needReminder()
        : (await this.repo.byUserIds([...new Set(userIds)])).map((r) => ({
            user_id: r.user_id,
            email: r.email,
            full_name: r.full_name,
          }));
    if (!targets.length) return 0;
    await this.prisma.db.$transaction(async (tx) => {
      await this.mail.requestMany(
        tx,
        targets.map((t) => ({
          to: t.email,
          kind: 'fee_reminder' as const,
          subject: 'Nhắc đóng phí thành viên OPC Hub',
          html:
            `<p>Xin chào ${esc(t.full_name)},</p>` +
            `<p>Phí thành viên OPC Hub (${FEE_AMOUNT.toLocaleString('vi-VN')}đ/năm) của bạn ` +
            `chưa được thanh toán hoặc sắp hết hạn. Vui lòng vào mục Gói dịch vụ để chuyển khoản.</p>`,
        })),
      );
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'fee.remind',
        entity: 'membership_fee',
        entityId:
          userIds === 'all'
            ? 'all'
            : targets
                .map((t) => t.user_id)
                .join(',')
                .slice(0, 200),
        tag: 'member',
        summary: `Gửi email nhắc phí tới ${targets.length} thành viên`,
        ip: actor.ip,
      });
    });
    return targets.length;
  }

  /** CSV như prototype (BOM + tiêu đề tiếng Việt); xuất dữ liệu cá nhân → audit */
  async export(actor: FeeActor, userIds: readonly string[]): Promise<FeeExport> {
    const rows = (await this.repo.byUserIds([...new Set(userIds)])).map(toRow);
    const head = 'Thành viên,Email,Loại,Ngày ĐK,Trạng thái phí,Ngày thu,Hiệu lực đến';
    const body = rows.map((f) =>
      [
        f.fullName,
        f.email,
        f.accountType === 'business' ? 'Doanh nghiệp' : 'Cá nhân',
        vnDate(f.joinedAt),
        STATUS_LABEL[f.status],
        vnDate(f.paidAt),
        vnDate(f.validUntil),
      ]
        .map(cell)
        .join(','),
    );
    await this.prisma.db.$transaction((tx) =>
      this.audit.log(tx, {
        actorId: actor.id,
        action: 'export.fees',
        entity: 'export',
        entityId: `fees-${Date.now()}`,
        tag: 'member',
        summary: `Xuất CSV phí thành viên (${rows.length})`,
        ip: actor.ip,
      }),
    );
    return { filename: 'phi-thanh-vien.csv', csv: `${BOM}${[head, ...body].join('\n')}` };
  }
}
