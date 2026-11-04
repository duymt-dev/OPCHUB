import type { AffiliateAdminListRow, AffiliateAdminRow } from '@opchub/shared/api-domains';
import type { AffiliateListRow, AffiliateTotals } from '../repositories/affiliate-admin.repository';
import { affiliateBankOf } from './me-affiliate.service';

/** Page-scoped payload only; all reads and aggregate arithmetic belong to the server. */
export function affiliateListPresentation(
  rows: AffiliateListRow[],
  items: AffiliateAdminRow[],
  lifetime: AffiliateTotals[],
  month?: string,
): AffiliateAdminListRow[] {
  const accounts = new Map(rows.map((row) => [row.id, affiliateBankOf(row)]));
  const totals = new Map(lifetime.map((row) => [row.affiliateId, row]));
  return items.map((row) => {
    const total = totals.get(row.id);
    return {
      ...row,
      region: null,
      bank: accounts.get(row.id) ?? null,
      lifetime: month
        ? { customers: total?.customers ?? 0, revenue: Number(total?.revenue ?? 0) }
        : { customers: row.customers, revenue: row.revenue },
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
