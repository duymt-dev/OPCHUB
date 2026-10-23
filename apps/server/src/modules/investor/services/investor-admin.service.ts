import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  type AdminInvestor,
  type AdminInvestorSummary,
  type CsvFile,
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

/** Admin "Nhà đầu tư" — gom theo người, danh sách + xuất CSV (audit); D-72 không trạng thái */
@Injectable()
export class InvestorAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: InvestorAdminRepository,
    private readonly audit: AuditService,
  ) {}

  private async build(rows: InvestorGroupRow[], tx?: DbTx): Promise<AdminInvestor[]> {
    const items = await this.repo.items(
      rows.map((r) => r.investor_key),
      tx,
    );
    return rows.map((r) => ({
      key: r.first_id,
      name: r.name,
      avatarUrl: r.avatar_url,
      kind: r.kind,
      organization: r.organization || (r.kind === 'individual' ? 'Nhà đầu tư cá nhân' : '—'),
      phone: r.phone || '—',
      totalAmount: Number(r.total_amount),
      lastAt: r.last_at.toISOString(),
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

  async detail(key: string): Promise<AdminInvestor> {
    const k = await this.repo.keyOf(key);
    if (!k) throw notFound(NOT_FOUND);
    const row = await this.repo.one(k.investorKey);
    if (!row) throw notFound(NOT_FOUND);
    const [one] = await this.build([row]);
    if (!one) throw notFound(NOT_FOUND);
    return one;
  }

  /** Đọc dữ liệu + audit trong CÙNG transaction (BUG-039): audit lỗi → không trả CSV */
  async export(actor: Actor, f: InvestorFilter): Promise<CsvFile> {
    return this.prisma.db.$transaction(async (tx) => {
      const list = await this.build(await this.repo.all(f, tx), tx);
      await this.log(tx, actor, 'investor.export', 'investors', `${list.length} dòng`);
      return { filename: 'nha-dau-tu.csv', csv: investorCsv(list) };
    });
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

const investorCsv = (list: readonly AdminInvestor[]): string =>
  toCsv(
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
