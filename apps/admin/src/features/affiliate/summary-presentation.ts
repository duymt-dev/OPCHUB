/** Display-only cost percentage. Financial amounts remain the API's unmodified integers. */
export function affiliateCostRatio(commission: number, revenue: number): string | undefined {
  return revenue > 0 ? String(Math.round((commission / revenue) * 1000) / 10) : undefined;
}

/** Calendar label for the scheduled month-end, not an executed/guaranteed payment. */
export function affiliatePayoutCalendar(now = Date.now()): string {
  const vn = new Date(now + 7 * 3_600_000);
  const year = vn.getUTCFullYear();
  const month = vn.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${lastDay}/${String(month + 1).padStart(2, '0')}/${year}`;
}
