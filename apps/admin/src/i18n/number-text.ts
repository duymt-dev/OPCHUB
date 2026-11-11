import { formatNumber } from './format';

/** Display a previously raw scalar without adding Intl's default three-decimal rounding. */
export const numberText = (value: number | null | undefined, locale: string) =>
  formatNumber(Object.is(value, -0) ? 0 : value, locale, { maximumSignificantDigits: 21 });
