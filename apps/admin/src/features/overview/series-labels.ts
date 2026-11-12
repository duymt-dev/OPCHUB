/** Presentation adapter for existing API labels. Unknown labels stay raw; never rebuild series data. */
export function seriesLabel(
  raw: string,
  period: 'week' | 'month' | 'year',
  labels: { week: (n: number) => string; month: (n: number) => string },
): string {
  if (period === 'month' && /^T(?:[1-9]|1[0-2])$/.test(raw))
    return labels.month(Number(raw.slice(1)));
  if (period === 'week' && /^W(?:[1-9]|[1-4]\d|5[0-3])$/.test(raw))
    return labels.week(Number(raw.slice(1)));
  return raw;
}
