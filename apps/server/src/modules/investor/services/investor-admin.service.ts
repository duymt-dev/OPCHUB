import { Injectable } from '@nestjs/common';
import type { DbTx, InvestorInterestStatus } from '@opchub/db';
import {
  type AdminInvestor,
  type AdminInvestorSummary,
  type CsvFile,
  INVESTOR_ADMIN_NAME,
  type InvestorComment,
  investorTransitionMessage,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { toCsv } from '@/common/http/csv';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { assertTransition, statusesBefore } from '../domain/interest-status';
import { InvestorCommentRepository, senderOf } from '../repositories/investor-comment.repository';
import {
  type InvestorFilter,
  type InvestorGroupRow,
  InvestorAdminRepository,
} from '../repositories/investor-admin.repository';

export interface Actor {
  id: string;
  ip: string | null;
}

const NOT_FOUND = 'Không tìm thấy nhà đầu tư';
const KIND_LABEL = { fund: 'Quỹ đầu tư', business: 'Doanh nghiệp', individual: 'Cá nhân' } as const;

/** Admin "Nhà đầu tư" (`p.pub`) — gom theo người, đổi trạng thái, trao đổi, xuất CSV (audit) */
@Injectable()
export class InvestorAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: InvestorAdminRepository,
    private readonly audit: AuditService,
    private readonly thread: InvestorCommentRepository,
    private readonly outbox: OutboxService,
  ) {}

  private async build(rows: InvestorGroupRow[]): Promise<AdminInvestor[]> {
    const items = await this.repo.items(rows.map((r) => r.investor_key));
    return rows.map((r) => ({
      key: r.first_id,
      name: r.name,
      avatarUrl: r.avatar_url,
      kind: r.kind,
      organization: r.organization || (r.kind === 'individual' ? 'Nhà đầu tư cá nhân' : '—'),
      phone: r.phone || '—',
      totalAmount: Number(r.total_amount),
      lastAt: r.last_at.toISOString(),
      status: r.status,
      commentCount: r.comment_count,
      items: items
        .filter((i) => i.investorKey === r.investor_key)
        .map((i) => ({
          interestId: i.id,
          projectId: i.projectId,
          projectName: i.project.name,
          ownerName: i.project.owner.fullName,
          amount: Number(i.amount),
          currency: i.currency === 'USD' ? ('USD' as const) : ('VND' as const),
          message: i.message,
          createdAt: i.createdAt.toISOString(),
        })),
    }));
  }

  async page(f: InvestorFilter & { page: number; size: number }) {
    const { rows, total } = await this.repo.page(f, f.page, f.size);
    return { items: await this.build(rows), page: f.page, size: f.size, total };
  }

  async summary(): Promise<AdminInvestorSummary> {
    const rows = await this.repo.summary();
    const by = (k: string) => rows.find((r) => r.kind === k)?._count._all ?? 0;
    return {
      total: rows.reduce((a, r) => a + r._count._all, 0),
      fund: by('fund'),
      business: by('business'),
      individual: by('individual'),
      totalAmount: rows.reduce((a, r) => a + Number(r._sum.totalAmount ?? 0n), 0),
    };
  }

  private async keyOf(key: string) {
    const k = await this.repo.keyOf(key);
    if (!k) throw notFound(NOT_FOUND);
    return k;
  }

  async detail(key: string): Promise<AdminInvestor> {
    const k = await this.keyOf(key);
    const row = await this.repo.one(k.investorKey);
    if (!row) throw notFound(NOT_FOUND);
    const [one] = await this.build([row]);
    if (!one) throw notFound(NOT_FOUND);
    return one;
  }

  /**
   * BUG-007, §9: chỉ đi tiến (Đã gửi → Đang trao đổi → Đã kết nối). Sai bước → 409; tổng hợp đã bị
   * đổi song song (cập nhật có điều kiện 0 dòng) → 409. Audit `diff {from,to}` (luật 10).
   */
  async setStatus(actor: Actor, key: string, to: InvestorInterestStatus): Promise<AdminInvestor> {
    const k = await this.keyOf(key);
    const from = await this.repo.statusOf(k.investorKey);
    if (!from) throw notFound(NOT_FOUND);
    assertTransition(from, to);
    await this.prisma.db.$transaction(async (tx) => {
      const ok = await this.repo.transition(tx, k.investorKey, from, to, statusesBefore(to));
      if (!ok) throw conflict(investorTransitionMessage(from, to));
      await this.log(tx, actor, 'investor.status', k.investorKey, to, { from, to });
    });
    return this.detail(key);
  }

  async comments(key: string): Promise<{ items: InvestorComment[] }> {
    const k = await this.keyOf(key);
    const rows = await this.thread.list(k.investorKey);
    return {
      items: rows.map((n) => ({
        id: n.id,
        authorName: senderOf(n, k.name),
        fromInvestor: n.from_investor,
        body: n.body,
        createdAt: n.created_at.toISOString(),
      })),
    };
  }

  /**
   * IV-R01/R03: tin Admin vào luồng chung + outbox `investor.admin_replied` (thông báo NĐT) cùng
   * transaction (luật 8); tin đầu tiên → mọi quan tâm "Đã gửi" chuyển "Đang trao đổi" (có điều kiện).
   */
  async comment(actor: Actor, key: string, body: string): Promise<InvestorComment> {
    const k = await this.keyOf(key);
    const n = await this.prisma.db.$transaction(async (tx) => {
      const c = await this.thread.add(tx, {
        investorKey: k.investorKey,
        interestId: null,
        authorId: actor.id,
        fromInvestor: false,
        body,
      });
      await this.repo.advanceSent(tx, k.investorKey);
      await this.outbox.add(tx, 'investor.admin_replied', {
        investorKey: k.investorKey,
        commentId: c.id,
      });
      await this.log(tx, actor, 'investor.comment', k.investorKey, body);
      return c;
    });
    return {
      id: n.id,
      authorName: INVESTOR_ADMIN_NAME,
      fromInvestor: false,
      body,
      createdAt: n.createdAt.toISOString(),
    };
  }

  async export(actor: Actor, f: InvestorFilter): Promise<CsvFile> {
    const list = await this.build(await this.repo.all(f));
    const csv = toCsv(
      ['Loại', 'Họ tên', 'Doanh nghiệp/Quỹ', 'Số điện thoại', 'Dự án', 'Tổng quan tâm (VND)'],
      list.map((i) => [
        KIND_LABEL[i.kind],
        i.name,
        i.organization,
        i.phone,
        i.items.map((x) => x.projectName).join(' / '),
        i.totalAmount,
      ]),
    );
    await this.prisma.db.$transaction((tx) =>
      this.log(tx, actor, 'investor.export', 'investors', `${list.length} dòng`),
    );
    return { filename: 'nha-dau-tu.csv', csv };
  }

  private log(
    tx: DbTx,
    actor: Actor,
    action: string,
    entityId: string,
    summary: string,
    diff?: Record<string, unknown>,
  ) {
    return this.audit.log(tx, {
      actorId: actor.id,
      action,
      entity: 'investor',
      entityId,
      tag: 'project',
      summary: summary.slice(0, 500),
      ip: actor.ip,
      ...(diff ? { diff } : {}),
    });
  }
}
