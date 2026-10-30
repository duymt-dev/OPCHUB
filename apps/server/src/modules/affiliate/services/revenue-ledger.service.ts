import { Injectable } from '@nestjs/common';
import type { RevenueLedgerQuery, RevenueMonthsQuery } from '@opchub/shared/api-domains';
import { notFound } from '@/common/errors';
import { MemberDirectory } from '../../account';
import { RevenueLedgerRepository } from '../repositories/revenue-ledger.repository';

@Injectable()
export class RevenueLedgerService {
  constructor(
    private readonly repo: RevenueLedgerRepository,
    private readonly members: MemberDirectory,
  ) {}

  private async requireDirector(id: string) {
    if (!(await this.repo.knownDirector(id))) throw notFound('Không tìm thấy GĐ Vùng');
  }

  async balance(id: string) {
    await this.requireDirector(id);
    return this.repo.balance(id);
  }

  async months(id: string, q: RevenueMonthsQuery) {
    await this.requireDirector(id);
    const rows = await this.repo.months(id, q);
    const items = rows.slice(0, q.size);
    return { items, nextCursor: rows.length > q.size ? (items.at(-1)?.monthKey ?? null) : null };
  }

  async ledger(id: string, q: RevenueLedgerQuery) {
    await this.requireDirector(id);
    const rows = await this.repo.ledger(id, q);
    const page = rows.slice(0, q.size);
    const affiliates = await this.repo.affiliates([
      ...new Set(page.flatMap((r) => (r.affiliateId ? [r.affiliateId] : []))),
    ]);
    const people = await this.members.byIds([
      ...new Set([...page.map((r) => r.customerId), ...affiliates.map((a) => a.userId)]),
    ]);
    const names = new Map(people.map((p) => [p.id, p.fullName]));
    const affiliateNames = new Map(affiliates.map((a) => [a.id, names.get(a.userId) ?? null]));
    const items = page.map((r) => ({
      ...r,
      customerName: names.get(r.customerId) ?? null,
      affiliateName: r.affiliateId ? (affiliateNames.get(r.affiliateId) ?? null) : null,
      receivedAt: r.receivedAt.toISOString(),
      recordedAt: r.recordedAt.toISOString(),
      firstReceivedAt: r.firstReceivedAt.toISOString(),
    }));
    const last = items.at(-1);
    return {
      items,
      nextCursor: rows.length > q.size && last ? { at: last.receivedAt, id: last.id } : null,
    };
  }
}
