export interface RegionalPolicy {
  regionalFirstYear: number;
  regionalStep: number;
  regionalMin: number;
}

/** D-122/130: anniversaries are calendar dates in Vietnam, not elapsed milliseconds. */
export function customerYearOf(firstPaidAt: Date | string, at: Date | string): number {
  const vn = (date: Date | string) => new Date(new Date(date).getTime() + 7 * 3600_000);
  const first = vn(firstPaidAt);
  const current = vn(at);
  const year = current.getUTCFullYear();
  const month = first.getUTCMonth();
  const day = Math.min(first.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  const anniversary = Date.UTC(year, month, day);
  const today = Date.UTC(year, current.getUTCMonth(), current.getUTCDate());
  return Math.max(1, year - first.getUTCFullYear() + (today >= anniversary ? 1 : 0));
}

export const regionalPercent = (year: number, policy: RegionalPolicy): number =>
  Math.max(
    policy.regionalMin,
    policy.regionalFirstYear - policy.regionalStep * (Math.max(1, year) - 1),
  );

export const regionalMinYear = (policy: RegionalPolicy): number | null =>
  policy.regionalFirstYear === policy.regionalMin
    ? 1
    : policy.regionalStep > 0
      ? Math.ceil((policy.regionalFirstYear - policy.regionalMin) / policy.regionalStep) + 1
      : null;

/** D-110: round once to whole VND; the residual always belongs to Media Soft. */
export function regionalAmount(base: number, percent: number) {
  const directorAmount = Math.round((base * percent) / 100);
  return { directorAmount, mediaSoftAmount: base - directorAmount };
}

export function payoutMonthOf(at: Date | string): string {
  return new Date(new Date(at).getTime() + 7 * 3600_000).toISOString().slice(0, 7);
}

export function regionalPayoutDate(at: Date | string): string {
  const month = payoutMonthOf(at);
  const [year = 0, m = 0] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10);
}
