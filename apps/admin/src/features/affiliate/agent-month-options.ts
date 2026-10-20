/** Calendar presentation only. The selected historic month remains available. */
export function agentMonthOptions(selected: string, now = Date.now()): string[] {
  const date = new Date(now + 7 * 3_600_000);
  const keys = Array.from({ length: 24 }, (_, i) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - i, 1)).toISOString().slice(0, 7),
  );
  return [...new Set([...(selected && selected !== 'all' ? [selected] : []), ...keys])]
    .sort()
    .reverse();
}
