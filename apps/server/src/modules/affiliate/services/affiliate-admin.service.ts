import { Injectable } from '@nestjs/common';
import {
  affiliateBankSchema,
  type AffiliateAdminRow,
  type AffiliateCommissionQuery,
  type AffiliatePageQuery,
} from '@opchub/shared/api-domains';
import { notFound } from '@/common/errors';
import { MemberDirectory } from '../../account';
import {
  AffiliateAdminRepository,
  type AffiliateListRow,
} from '../repositories/affiliate-admin.repository';
import {
  CommissionAdminRepository,
  type AdminCommissionRow,
} from '../repositories/commission-admin.repository';
import { affiliateBankOf } from './me-affiliate.service';

@Injectable()
export class AffiliateAdminService {
  constructor(
    private readonly affiliates: AffiliateAdminRepository,
    private readonly commissions: CommissionAdminRepository,
    private readonly members: MemberDirectory,
  ) {}

  summary(month?: string) {
    return this.commissions.summary(month);
  }

  async commissionsPage(q: AffiliateCommissionQuery) {
    const ids = q.q ? await this.members.searchIds(q.q) : [];
    const [rows, total] = await Promise.all([
      this.commissions.page(q, ids),
      this.commissions.count(q, ids),
    ]);
    const contacts = await this.members.byIds([
      ...new Set(rows.flatMap((r) => [r.affiliateUserId, r.customerId])),
    ]);
    const names = new Map(contacts.map((c) => [c.id, c.fullName]));
    return {
      items: rows.map((r) => this.commissionDto(r, names)),
      page: q.page,
      size: q.size,
      total,
    };
  }

  async page(q: AffiliatePageQuery) {
    const ids = q.q ? await this.members.searchIds(q.q) : [];
    const [rows, total] = await Promise.all([
      this.affiliates.page(q, ids),
      this.affiliates.count(q, ids),
    ]);
    return { items: await this.listDto(rows, q.month), page: q.page, size: q.size, total };
  }

  async detail(id: string) {
    const row = await this.require(id);
    const [dto] = await this.listDto([
      { ...row, date: row.createdAt, hasBank: affiliateBankOf(row) !== null },
    ]);
    if (!dto) throw notFound('Không tìm thấy đại lý');
    const [totals] = await this.affiliates.totals([id]);
    return {
      ...dto,
      bank: affiliateBankOf(row),
      stats: {
        customers: dto.customers,
        revenue: dto.revenue,
        paid: dto.paid,
        commission: Number(totals?.commission ?? 0),
      },
    };
  }

  async months(id: string, q: AffiliatePageQuery) {
    await this.require(id);
    const data = await this.affiliates.months(id, q);
    return {
      items: data.items.map((r) => ({
        ...r,
        amount: Number(r.amount),
        payable: Number(r.payable),
        paidAt: r.paidAt?.toISOString() ?? null,
      })),
      page: q.page,
      size: q.size,
      total: data.total,
    };
  }

  async customers(id: string, q: AffiliatePageQuery) {
    await this.require(id);
    const data = await this.affiliates.customers(id, q);
    const contacts = await this.members.byIds(data.items.map((r) => r.customerId));
    const names = new Map(contacts.map((c) => [c.id, c.fullName]));
    return {
      items: data.items.map((r) => ({
        ...r,
        name: names.get(r.customerId) ?? 'Thành viên đã xóa',
        plan: 'Phí thành viên 12 tháng',
        date: r.date.toISOString(),
        paidAt: r.paidAt?.toISOString() ?? null,
        bank: r.bank === null ? null : affiliateBankSchema.parse(r.bank),
      })),
      page: q.page,
      size: q.size,
      total: data.total,
    };
  }

  async listDto(rows: AffiliateListRow[], month?: string): Promise<AffiliateAdminRow[]> {
    const [contacts, totals] = await Promise.all([
      this.members.byIds(rows.map((r) => r.userId)),
      this.affiliates.totals(
        rows.map((r) => r.id),
        month,
      ),
    ]);
    const people = new Map(contacts.map((c) => [c.id, c]));
    const stats = new Map(totals.map((s) => [s.affiliateId, s]));
    return rows.map((r) => {
      const s = stats.get(r.id),
        person = people.get(r.userId);
      const balance = Number(s?.balance ?? 0),
        paid = Number(s?.paid ?? 0);
      return {
        id: r.id,
        userId: r.userId,
        name: person?.fullName ?? 'Thành viên đã xóa',
        email: person?.email ?? '',
        code: r.code,
        rate: r.rate,
        status: r.status,
        source: 'auto',
        hasBank: r.hasBank,
        customers: s?.customers ?? 0,
        revenue: Number(s?.revenue ?? 0),
        balance,
        paid,
        monthStatus: balance > 0 ? 'recorded' : paid > 0 ? 'paid' : 'none',
      };
    });
  }

  commissionDto(row: AdminCommissionRow, names: ReadonlyMap<string, string>) {
    return {
      id: row.id,
      affiliateId: row.affiliateId,
      affiliateName: names.get(row.affiliateUserId) ?? 'Thành viên đã xóa',
      customerName: names.get(row.customerId) ?? 'Thành viên đã xóa',
      code: row.code,
      date: row.date.toISOString(),
      feeAmount: row.feeAmount,
      rate: row.rate,
      amount: row.amount,
      status: row.status,
      cancelReason: row.cancelReason,
    };
  }

  private async require(id: string) {
    const row = await this.affiliates.byId(id);
    if (!row) throw notFound('Không tìm thấy đại lý');
    return row;
  }
}
