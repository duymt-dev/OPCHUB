import { Injectable } from '@nestjs/common';
import type { DbTx, InvestorInterestStatus } from '@opchub/db';
import type {
  AdminInvestor,
  AdminInvestorSummary,
  CsvFile,
  InvestorComment,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { notFound } from '@/common/errors';
import { toCsv } from '@/common/http/csv';
import { PrismaService } from '@/common/prisma/prisma.service';
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
const ADMIN_NAME = 'Admin OPC Hub';

/** Admin "Nhà đầu tư" (`p.pub`) — gom theo người, đổi trạng thái, trao đổi, xuất CSV (audit) */
@Injectable()
export class InvestorAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: InvestorAdminRepository,
    private readonly audit: AuditService,
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

  /** Q-G5c-3: chuyển tự do giữa 3 bước, áp cho mọi quan tâm của nhà đầu tư */
  async setStatus(
    actor: Actor,
    key: string,
    status: InvestorInterestStatus,
  ): Promise<AdminInvestor> {
    const k = await this.keyOf(key);
    await this.prisma.db.$transaction(async (tx) => {
      await this.repo.setStatus(tx, k.investorKey, status);
      await this.log(tx, actor, 'investor.status', k.investorKey, status);
    });
    return this.detail(key);
  }

  async comments(key: string): Promise<{ items: InvestorComment[] }> {
    const k = await this.keyOf(key);
    const rows = await this.repo.notes(k.investorKey);
    return {
      items: rows.map((n) => ({
        id: n.id,
        authorName: n.fromInvestor ? k.name : ADMIN_NAME,
        fromInvestor: n.fromInvestor,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  /** Ghi chú đầu tiên → mọi quan tâm "Đã gửi" chuyển "Đang trao đổi" (có điều kiện) */
  async comment(actor: Actor, key: string, body: string): Promise<InvestorComment> {
    const k = await this.keyOf(key);
    const n = await this.prisma.db.$transaction(async (tx) => {
      const note = await this.repo.addNote(tx, k.investorKey, actor.id, body);
      await this.repo.advanceSent(tx, k.investorKey);
      await this.log(tx, actor, 'investor.comment', k.investorKey, body);
      return note;
    });
    return {
      id: n.id,
      authorName: ADMIN_NAME,
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

  private log(tx: DbTx, actor: Actor, action: string, entityId: string, summary: string) {
    return this.audit.log(tx, {
      actorId: actor.id,
      action,
      entity: 'investor',
      entityId,
      tag: 'project',
      summary: summary.slice(0, 500),
      ip: actor.ip,
    });
  }
}
