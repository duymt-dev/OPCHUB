import { formatDate, formatNumber } from '@/i18n/format';

/** Display-only cost percentage. Financial amounts remain the API's unmodified integers. */
export function affiliateCostRatio(
  commission: number,
  revenue: number,
  locale = 'vi',
): string | undefined {
  if (!(revenue > 0)) return undefined;
  const ratio = Math.round((commission / revenue) * 1000) / 10;
  return locale === 'vi' ? String(ratio) : formatNumber(ratio, locale);
}

/** Calendar label for the scheduled month-end, not an executed/guaranteed payment. */
export function affiliatePayoutCalendar(now = Date.now(), locale = 'vi'): string {
  const vn = new Date(now + 7 * 3_600_000);
  const year = vn.getUTCFullYear();
  const month = vn.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return formatDate(date, locale);
}
