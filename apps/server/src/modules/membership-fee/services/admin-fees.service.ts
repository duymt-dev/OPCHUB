import { Injectable } from '@nestjs/common';
import { type MembershipFeeStatus, planAmountOf } from '@opchub/shared';
import type { FeeAction, FeeExport, FeeRow, FeeSummary } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { OutboxService } from '@/common/outbox';
import { notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PriceConfigService } from '@/modules/pricing';
import { type FeeReminderKind, feeReminderLine, feeReminderMail, MailService } from '../../mail';
import { daysLeft } from '../domain/fee-reminder';
import { localPhone } from '../domain/fee-period';
import {
  AdminFeesRepository,
  type FeeListRow,
  type ReminderTarget,
} from '../repositories/admin-fees.repository';
import { MembershipFeeService } from './membership-fee.service';

export interface FeeActor {
  id: string;
  ip: string | null;
}

/** Q-B15-1: thu tay bắt buộc lý do (CHECK DB, D-41) — hợp đồng FE chưa gửi lý do */
export const DEFAULT_COLLECT_REASON = 'Admin ghi nhận đã thu';

/** Nhắc tay: mẫu theo trạng thái hiện tại (NA-04) */
const manualKind = (t: ReminderTarget, now: Date): FeeReminderKind => {
  if (t.status === 'pending_payment' || !t.valid_until) return 'pending';
  // D-113: trial nhắc theo mốc ngày còn lại như kỳ phí (T-7 / T-0), câu riêng ở template

  const d = daysLeft(t.valid_until, now);
  if (d < 0) return 'T+3';
  if (d === 0) return 'T-0';
  return d <= 7 ? 'T-7' : 'T-30';
};

const toRow = (r: FeeListRow, groups: readonly string[] = []): FeeRow => ({
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
  groups: [...groups],
});

const STATUS_LABEL: Record<MembershipFeeStatus, string> = {
  trial: 'Miễn phí 3 tháng',
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
    private readonly outbox: OutboxService,
    private readonly prices: PriceConfigService,
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
    const groups = await this.repo.groupNames(rows.map((r) => r.user_id));
    return { items: rows.map((r) => toRow(r, groups.get(r.user_id))), page, size, total };
  }

  async summary(): Promise<FeeSummary> {
    const [rows, prices] = await Promise.all([this.repo.summary(), this.prices.current()]);
    const counts = new Map<MembershipFeeStatus, number>();
    let revenue = 0;
    for (const r of rows) {
      const k = Number(r.n);
      counts.set(r.status, (counts.get(r.status) ?? 0) + k);
      if (r.status === 'active' || r.status === 'expiring')
        revenue += k * planAmountOf(prices, r.plan);
    }
    const n = (s: MembershipFeeStatus) => counts.get(s) ?? 0;
    return {
      total: [...counts.values()].reduce((a, b) => a + b, 0),
      active: n('active'),
      trial: n('trial'),
      pending_payment: n('pending_payment'),
      expiring: n('expiring'),
      expired: n('expired'),
      paid: n('active') + n('expiring'),
      revenue,
    };
  }

  async row(userId: string): Promise<FeeRow> {
    const [r] = await this.repo.byUserIds([userId]);
    if (!r || r.account_type === 'investor') throw notFound('Không tìm thấy thành viên');
    const groups = await this.repo.groupNames([userId]);
    return toRow(r, groups.get(userId));
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

  /**
   * Nhắc tay (NA-04): mail theo trạng thái + thông báo chuông (§12) qua outbox, audit một dòng.
   * Không ghi `fee_reminders` — Admin nhắc bất kỳ lúc nào.
   */
  async remind(
    actor: FeeActor,
    userIds: readonly string[] | 'all',
    now = new Date(),
  ): Promise<number> {
    const targets: ReminderTarget[] =
      userIds === 'all'
        ? await this.repo.needReminder()
        : await this.repo.byUserIds([...new Set(userIds)]);
    if (!targets.length) return 0;
    await this.prisma.db.$transaction(async (tx) => {
      const kinded = targets.map((t) => ({
        t,
        kind: manualKind(t, now),
        trial: t.status === 'trial',
      }));
      await this.mail.requestMany(
        tx,
        kinded.map(({ t, kind, trial }) => {
          const m = feeReminderMail(t.full_name, kind, t.valid_until, t.amount, trial);
          return { to: t.email, kind: 'fee_reminder' as const, subject: m.subject, html: m.html };
        }),
      );
      const items = kinded.map(({ t, kind, trial }) => ({
        userId: t.user_id,
        text: feeReminderLine(kind, t.valid_until, trial),
      }));
      const chunks = Array.from({ length: Math.ceil(items.length / 500) }, (_, k) => ({
        items: items.slice(k * 500, k * 500 + 500),
      }));
      await this.outbox.addMany(tx, 'membership_fee.reminded', chunks);
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

  /**
   * CSV như prototype (BOM + tiêu đề tiếng Việt); đọc dữ liệu + audit trong CÙNG transaction
   * (BUG-039): audit lỗi → không trả CSV.
   */
  async export(actor: FeeActor, userIds: readonly string[]): Promise<FeeExport> {
    return this.prisma.db.$transaction(async (tx) => {
      const rows = (await this.repo.byUserIds([...new Set(userIds)], tx)).map((r) => toRow(r));
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'export.fees',
        entity: 'export',
        entityId: `fees-${Date.now()}`,
        tag: 'member',
        summary: `Xuất CSV phí thành viên (${rows.length})`,
        ip: actor.ip,
      });
      return { filename: 'phi-thanh-vien.csv', csv: feesCsv(rows) };
    });
  }
}

const FEES_HEAD = 'Thành viên,Email,Loại,Ngày ĐK,Trạng thái phí,Ngày thu,Hiệu lực đến';
const feesCsv = (rows: readonly FeeRow[]): string => {
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
  return `${BOM}${[FEES_HEAD, ...body].join('\n')}`;
};
