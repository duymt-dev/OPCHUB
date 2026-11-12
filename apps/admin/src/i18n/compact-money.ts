import { formatNumber } from './format';
import { selectedLocaleOf } from './locales';

/** Presentation only: retain the original MONEY thresholds and JS rounding, never convert currency. */
export function compactMoney(
  value: number | null | undefined,
  currency: 'VND' | 'USD',
  locale: string,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const large = currency === 'USD' ? 1e6 : 1e9;
  const small = currency === 'USD' ? 1e3 : 1e6;
  const digits = value % large ? 1 : 0;
  const rounded =
    value >= large
      ? Number((value / large).toFixed(digits)) * large
      : value >= small
        ? Math.round(value / small) * small
        : value;

  // Keep the prototype's Vietnamese presentation exactly, including non-compact negatives.
  if (selectedLocaleOf(locale) === 'vi') {
    if (currency === 'USD') {
      if (value >= large) return `$${(value / large).toFixed(digits)}M`;
      return value >= small ? `$${Math.round(value / small)}K` : `$${value}`;
    }
    if (value >= large) return `${(value / large).toFixed(digits).replace('.', ',')} tỷ ₫`;
    return value >= small
      ? `${Math.round(value / small)} triệu ₫`
      : `${formatNumber(value, locale)} ₫`;
  }

  return formatNumber(rounded, locale, {
    style: 'currency',
    currency,
    notation: value >= small ? 'compact' : 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= large ? digits : value < small && currency === 'USD' ? 20 : 0,
  });
}
