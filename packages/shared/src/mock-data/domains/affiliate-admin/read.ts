import type { z } from 'zod';
import type {
  AffiliateAdminRow,
  AffiliateCommissionQuery,
  AffiliatePageQuery,
  affiliateCommissionRowSchema,
  affiliateDetailSchema,
  affiliateMonthRowSchema,
} from '../../../api-domains';
import { affiliateMockState, syncMockAffiliates } from '../affiliate';
import { mockDb } from '../store';
import { notFound, ok, type MockResult } from '../util';
import { mockAffiliateListPresentation } from './list-presentation';
import {
  affiliateCommissionRefs,
  affiliateSearchMatches,
  mockAffiliatePage,
  paidSnapshot,
} from './state';

type Commission = z.infer<typeof affiliateCommissionRowSchema>;
type Detail = z.infer<typeof affiliateDetailSchema>;
type Month = z.infer<typeof affiliateMonthRowSchema>;

export function mockAdminCommissionRows(q: AffiliateCommissionQuery): Commission[] {
  const agents = syncMockAffiliates().agents;
  return affiliateCommissionRefs()
    .flatMap((r): Commission[] => {
      const row = r.row;
      if (row.status === 'pending' || row.status === 'void') return [];
      const agent = agents.get(r.agentId);
      if ((q.month && r.month !== q.month) || (q.status !== 'all' && row.status !== q.status))
        return [];
      if (!affiliateSearchMatches(`${row.name} ${agent?.name ?? ''} ${agent?.code ?? ''}`, q.q))
        return [];
      return [
        {
          id: row.id,
          affiliateId: r.agentId,
          affiliateName: agent?.name ?? '',
          code: agent?.code ?? '',
          customerName: row.name,
          date: row.date,
          feeAmount: row.feeAmount,
          rate: row.rate,
          amount: row.commission,
          status: row.status,
          cancelReason: row.cancelReason,
        },
      ];
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export const mockAdminCommissions = (q: AffiliateCommissionQuery) =>
  mockAffiliatePage(mockAdminCommissionRows(q), q);

export function mockAdminAffiliateSummary(month?: string) {
  const rows = affiliateCommissionRefs().filter(
    (r) => r.row.status !== 'cancelled' && (!month || r.month === month),
  );
  const sum = (status?: 'recorded' | 'paid') =>
    rows
      .filter((r) => !status || r.row.status === status)
      .reduce((total, r) => total + r.row.commission, 0);
  const revenue = rows.reduce((total, r) => total + r.row.feeAmount, 0);
  const totalCommission = sum();
  return {
    revenue,
    totalCommission,
    payable: sum('recorded'),
    paid: sum('paid'),
    netRevenue: revenue - totalCommission,
  };
}

export function mockAdminAffiliateRows(q: AffiliatePageQuery): AffiliateAdminRow[] {
  const state = syncMockAffiliates();
  const refs = affiliateCommissionRefs();
  const fees = new Map(mockDb().fees.map((fee) => [fee.userId, fee]));
  return [...state.agents.values()]
    .filter((a) => affiliateSearchMatches(`${a.name} ${a.email} ${a.code}`, q.q))
    .sort(
      (a, b) =>
        (fees.get(b.userId)?.paidAt ?? '').localeCompare(fees.get(a.userId)?.paidAt ?? '') ||
        b.userId.localeCompare(a.userId),
    )
    .map((agent) => {
      const fee = fees.get(agent.userId);
      const valid = refs.filter(
        (r) =>
          r.agentId === agent.userId &&
          r.row.status !== 'cancelled' &&
          (!q.month || r.month === q.month),
      );
      const balance = valid
        .filter((r) => r.row.status === 'recorded')
        .reduce((n, r) => n + r.row.commission, 0);
      const paid = valid
        .filter((r) => r.row.status === 'paid')
        .reduce((n, r) => n + r.row.commission, 0);
      const active =
        !!fee?.validUntil &&
        Date.parse(fee.validUntil) >= Date.now() &&
        (fee.status === 'active' || fee.status === 'expiring');
      return {
        id: agent.userId,
        userId: agent.userId,
        name: agent.name,
        email: agent.email,
        code: agent.code,
        rate: agent.rate,
        status: active ? 'active' : 'paused',
        source: 'auto',
        customers: valid.length,
        revenue: valid.reduce((n, r) => n + r.row.feeAmount, 0),
        balance,
        paid,
        monthStatus: balance > 0 ? 'recorded' : paid > 0 ? 'paid' : 'none',
        hasBank: agent.bank !== null,
      };
    });
}

export function mockAdminAffiliates(q: AffiliatePageQuery) {
  const rows = mockAdminAffiliateRows(q);
  const lifetime = q.month ? mockAdminAffiliateRows({ page: 1, size: 1 }) : rows;
  return mockAffiliatePage(
    mockAffiliateListPresentation(rows, lifetime, syncMockAffiliates().agents, q.month),
    q,
  );
}

export function mockAdminAffiliateDetail(id: string): MockResult<Detail> {
  const agent = syncMockAffiliates().agents.get(id);
  const row = mockAdminAffiliateRows({ page: 1, size: 1 }).find((r) => r.id === id);
  if (!agent || !row) return notFound('Không tìm thấy đại lý');
  return ok({
    ...row,
    bank: agent.bank,
    stats: {
      customers: row.customers,
      revenue: row.revenue,
      commission: row.balance + row.paid,
      paid: row.paid,
    },
  });
}

export function mockAdminAffiliateMonths(id: string, q: AffiliatePageQuery) {
  if (!syncMockAffiliates().agents.has(id)) return notFound('Không tìm thấy đại lý');
  const grouped = new Map<string, ReturnType<typeof affiliateCommissionRefs>>();
  for (const ref of affiliateCommissionRefs().filter((r) => r.agentId === id)) {
    const refs = grouped.get(ref.month) ?? [];
    refs.push(ref);
    grouped.set(ref.month, refs);
  }
  const rows = [...grouped]
    .map(([monthKey, refs]): Month => {
      const valid = refs.filter((r) => r.row.status !== 'cancelled');
      const statuses = new Set(refs.map((r) => r.row.status));
      const first = refs[0]?.row.status;
      const status =
        statuses.size > 1
          ? 'mixed'
          : first === 'paid' || first === 'cancelled'
            ? first
            : 'recorded';
      return {
        monthKey,
        customers: valid.length,
        amount: valid.reduce((n, r) => n + r.row.commission, 0),
        payable: valid
          .filter((r) => r.row.status === 'recorded')
          .reduce((n, r) => n + r.row.commission, 0),
        status,
        paidAt:
          refs
            .map((r) => paidSnapshot(r).paidAt)
            .filter((v): v is string => !!v)
            .sort()
            .at(-1) ?? null,
      };
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  return ok(mockAffiliatePage(rows, q));
}

export function mockAdminAffiliateCustomers(id: string, q: AffiliatePageQuery) {
  if (!affiliateMockState().agents.has(id)) return notFound('Không tìm thấy đại lý');
  const refs = affiliateCommissionRefs()
    .filter((r) => r.agentId === id)
    .sort((a, b) => b.row.date.localeCompare(a.row.date) || b.row.id.localeCompare(a.row.id));
  return ok(
    mockAffiliatePage(
      refs.map((r) => ({ ...r.row, ...paidSnapshot(r) })),
      q,
    ),
  );
}
