import { Injectable } from '@nestjs/common';
import {
  affiliateBankSchema,
  type RevenueFormerQuery,
  type RevenueStats,
  type RevenueDirector,
} from '@opchub/shared/api-domains';
import { MemberDirectory } from '../../account';
import { RegionalDirectorRepository } from '../repositories/regional-director.repository';
import { RevenueDashboardRepository } from '../repositories/revenue-dashboard.repository';

const zero: RevenueStats = {
  receiptCount: '0',
  affiliateCount: '0',
  received: '0',
  allocated: '0',
  paid: '0',
  due: '0',
  mediaSoft: '0',
};
const bankOf = (value: unknown) => {
  const bank = affiliateBankSchema.safeParse(value);
  return bank.success ? bank.data : null;
};
/** Prototype filters due/paid by visible name/scope, but keeps total allocation unfiltered. */
function visibility(items: RevenueDirector[], query: string) {
  const regions = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam' };
  const q = query.trim().toLocaleLowerCase('vi');
  const visible = items.filter((r) =>
    `${r.name ?? ''} ${regions[r.region]} · ${r.provinces.length} tỉnh`
      .toLocaleLowerCase('vi')
      .includes(q),
  );
  return {
    ids: visible.map((r) => r.id),
    due: visible.reduce((sum, r) => sum + BigInt(r.stats.due), 0n).toString(),
    paid: visible.reduce((sum, r) => sum + BigInt(r.stats.paid), 0n).toString(),
  };
}

@Injectable()
export class RevenueDashboardService {
  constructor(
    private readonly repo: RevenueDashboardRepository,
    private readonly slots: RegionalDirectorRepository,
    private readonly members: MemberDirectory,
  ) {}

  retained() {
    return this.repo.retained();
  }

  async dashboard(query = '', now = new Date()) {
    const slots = await this.slots.slots();
    const ids = slots.flatMap((s) => (s.userId ? [s.userId] : []));
    const [people, stats, policy] = await Promise.all([
      this.members.byIds(ids),
      this.repo.stats(ids),
      this.repo.policy(),
    ]);
    const names = new Map(people.map((p) => [p.id, p]));
    const totals = new Map(stats.map((r) => [r.directorId, r]));
    const items = slots.map((s) => ({
      id: s.region,
      directorId: s.userId,
      name: s.userId ? (names.get(s.userId)?.fullName ?? null) : null,
      email: s.userId ? (names.get(s.userId)?.email ?? null) : null,
      region: s.region,
      provinces: s.provinces.map((p) => p.province),
      current: true,
      bank: s.userId ? bankOf(s) : null,
      stats: s.userId ? (totals.get(s.userId) ?? zero) : zero,
    }));
    return {
      asOf: now.toISOString(),
      policy,
      stats: totals.get(null) ?? zero,
      items,
      visible: visibility(items, query),
    };
  }

  async former(q: RevenueFormerQuery) {
    const rows = await this.repo.former(q);
    const page = rows.slice(0, q.size);
    const ids = page.map((r) => r.directorId);
    const [people, stats] = await Promise.all([this.members.byIds(ids), this.repo.stats(ids)]);
    const names = new Map(people.map((p) => [p.id, p]));
    const totals = new Map(stats.map((r) => [r.directorId, r]));
    const items = page.map((r) => ({
      id: r.directorId,
      directorId: r.directorId,
      region: r.region,
      current: false,
      name: names.get(r.directorId)?.fullName ?? r.name,
      email: names.get(r.directorId)?.email ?? null,
      provinces: [],
      bank: bankOf(r),
      stats: totals.get(r.directorId) ?? zero,
    }));
    return { items, nextCursor: rows.length > q.size ? (items.at(-1)?.directorId ?? null) : null };
  }
}
