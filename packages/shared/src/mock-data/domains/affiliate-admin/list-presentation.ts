import { mockAffiliateRegion } from '../affiliate-regional-projection';
import type { AffiliateAdminListRow, AffiliateAdminRow, AffiliateBank } from '../../../api-domains';

/** Fake provider mirrors the server DTO; no rendering component calculates these totals. */
export function mockAffiliateListPresentation(
  rows: AffiliateAdminRow[],
  lifetimeRows: AffiliateAdminRow[],
  agents: ReadonlyMap<string, { bank: AffiliateBank | null }>,
  month?: string,
): AffiliateAdminListRow[] {
  const lifetime = new Map(lifetimeRows.map((row) => [row.id, row]));
  return rows.map((row) => {
    const total = lifetime.get(row.id);
    return {
      ...row,
      region: mockAffiliateRegion(row.userId),
      bank: agents.get(row.id)?.bank ?? null,
      lifetime: { customers: total?.customers ?? 0, revenue: total?.revenue ?? 0 },
      period: {
        month: month ?? null,
        customers: row.customers,
        commission: row.balance + row.paid,
        payable: row.balance,
        paid: row.paid,
        status:
          row.balance > 0 ? (row.paid > 0 ? 'mixed' : 'recorded') : row.paid > 0 ? 'paid' : 'none',
      },
    };
  });
}
