import {
  revenueLedgerSchema,
  revenueMonthsSchema,
  revenuePayoutHistorySchema,
  type RevenueStats,
  type RevenueLedgerQuery,
  type RevenueMonthsQuery,
  type RevenuePayoutHistoryQuery,
} from '../../../api-domains';
import { mockDirectorState } from '../regional-directors/state';
import { mockDb } from '../store';
import { notFound, ok } from '../util';
import { drainMockRevenue } from './capture';
import type { MockRevenueShare } from './schema';

export function revenueStats(rows: MockRevenueShare[]): RevenueStats {
  const sum = (
    key: 'amount' | 'directorAmount' | 'mediaSoftAmount',
    status?: 'paid' | 'recorded',
  ) =>
    rows
      .filter((r) => !status || r.status === status)
      .reduce((n, r) => n + BigInt(r[key]), 0n)
      .toString();
  return {
    receiptCount: String(rows.length),
    affiliateCount: String(
      new Set(rows.flatMap((r) => (r.affiliateId ? [r.affiliateId] : []))).size,
    ),
    received: sum('amount'),
    allocated: sum('directorAmount'),
    paid: sum('directorAmount', 'paid'),
    due: sum('directorAmount', 'recorded'),
    mediaSoft: sum('mediaSoftAmount'),
  };
}
export const knownMockRevenueDirector = (id: string) =>
  mockDirectorState().config.slots.some((s) => s.incumbent?.id === id) ||
  drainMockRevenue().shares.some((r) => r.director?.id === id);
const rowsOf = (id: string) => drainMockRevenue().shares.filter((r) => r.director?.id === id);
export const mockRevenueBalance = (id: string) =>
  knownMockRevenueDirector(id) ? ok(revenueStats(rowsOf(id))) : notFound('Không tìm thấy GĐ Vùng');
const name = (id: string | null) => mockDb().fees.find((f) => f.userId === id)?.fullName ?? null;
export function mockRevenueLedger(id: string, q: RevenueLedgerQuery) {
  if (!knownMockRevenueDirector(id)) return notFound('Không tìm thấy GĐ Vùng');
  const rows = rowsOf(id)
    .filter(
      (r) =>
        !q.beforeAt ||
        r.receivedAt < q.beforeAt ||
        (r.receivedAt === q.beforeAt && r.id < (q.beforeId ?? '')),
    )
    .toSorted((a, b) => b.receivedAt.localeCompare(a.receivedAt) || b.id.localeCompare(a.id));
  const items = rows
    .slice(0, q.size)
    .map((r) => ({ ...r, customerName: name(r.customerId), affiliateName: name(r.affiliateId) }));
  const last = items.at(-1);
  return ok(
    revenueLedgerSchema.parse({
      items,
      nextCursor: rows.length > q.size && last ? { at: last.receivedAt, id: last.id } : null,
    }),
  );
}
export function mockRevenueMonths(id: string, q: RevenueMonthsQuery) {
  if (!knownMockRevenueDirector(id)) return notFound('Không tìm thấy GĐ Vùng');
  const rows = rowsOf(id);
  const months = [...new Set(rows.map((r) => r.monthKey))]
    .filter((m) => !q.beforeMonth || m < q.beforeMonth)
    .sort()
    .reverse();
  const items = months.slice(0, q.size).map((monthKey) => ({
    monthKey,
    ...revenueStats(rows.filter((r) => r.monthKey === monthKey)),
  }));
  return ok(
    revenueMonthsSchema.parse({
      items,
      nextCursor: months.length > q.size ? items.at(-1)?.monthKey : null,
    }),
  );
}
export function mockRevenueHistory(q: RevenuePayoutHistoryQuery) {
  const rows = drainMockRevenue()
    .payouts.map((r) => r.receipt)
    .filter((r) => !q.directorId || r.directorId === q.directorId)
    .filter(
      (r) =>
        !q.beforeAt ||
        r.paidAt < q.beforeAt ||
        (r.paidAt === q.beforeAt && r.id < (q.beforeId ?? '')),
    )
    .toSorted((a, b) => b.paidAt.localeCompare(a.paidAt) || b.id.localeCompare(a.id));
  const items = rows.slice(0, q.size),
    last = items.at(-1);
  return revenuePayoutHistorySchema.parse({
    items,
    nextCursor: rows.length > q.size && last ? { at: last.paidAt, id: last.id } : null,
  });
}
