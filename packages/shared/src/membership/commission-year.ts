/** D-131: a snapshot rate; null means no commission row, never a zero-dong row. */
export function commissionRateFor(
  year: number,
  policy: { firstYearRate: number; renewalRate: number; renewalMaxYear: number },
): number | null {
  if (!Number.isInteger(year) || year < 1) return null;
  const rate =
    year === 1 ? policy.firstYearRate : year <= policy.renewalMaxYear ? policy.renewalRate : 0;
  return rate > 0 ? rate : null;
}
