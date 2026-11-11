import { intlLocaleOf } from './locales';

export const ADMIN_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const EMPTY = '—';
const finite = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Presentation only. Do not use these strings as API, sorting, input or export values. */
export function formatNumber(
  value: number | null | undefined,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  return finite(value) ? new Intl.NumberFormat(intlLocaleOf(locale), options).format(value) : EMPTY;
}

export function formatCurrency(
  value: number | null | undefined,
  currency: 'VND' | 'USD',
  locale: string,
): string {
  if (!finite(value)) return EMPTY;
  if (locale === 'vi' && currency === 'VND') return `${formatNumber(value, locale)}đ`;
  return formatNumber(value, locale, {
    style: 'currency',
    currency,
    ...(currency === 'VND' ? { maximumFractionDigits: 0, minimumFractionDigits: 0 } : {}),
  });
}

/** A stored 33 means 33%, not 3300%. No business rounding is applied here. */
export const formatPercentPoints = (value: number | null | undefined, locale: string) =>
  finite(value)
    ? formatNumber(value / 100, locale, { style: 'percent', maximumFractionDigits: 2 })
    : EMPTY;

function displayDate(value: string | Date): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00+07:00`);
    const canonical = new Intl.DateTimeFormat('en-CA', {
      timeZone: ADMIN_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return !Number.isNaN(date.getTime()) && canonical.format(date) === value ? date : undefined;
  }
  // Reject ambiguous machine-local strings: timestamps must carry UTC or an explicit offset.
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' },
): string {
  const date = value ? displayDate(value) : undefined;
  if (!date) return EMPTY;
  return new Intl.DateTimeFormat(intlLocaleOf(locale), {
    ...options,
    timeZone: ADMIN_TIME_ZONE,
    calendar: 'gregory',
  }).format(date);
}
