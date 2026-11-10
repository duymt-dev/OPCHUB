import type { AdminOverviewQuery } from '@opchub/shared/api-domains';

const DAY = 86_400_000;
const VN_OFFSET = 7 * 3_600_000;
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
const vnDate = (now: Date) => new Date(now.getTime() + VN_OFFSET);

export interface OverviewInterval {
  start: string;
  day: string;
  label: string;
  key: string;
}

/** Full ISO weeks, including previous December when ISO week 1 crosses years. */
export function lastWeeks(now: Date): OverviewInterval[] {
  const vn = vnDate(now);
  const today = new Date(`${dateOnly(vn)}T00:00:00Z`);
  const monday = today.getTime() - ((today.getUTCDay() + 6) % 7) * DAY;
  return Array.from({ length: 7 }, (_, i) => {
    const start = new Date(monday - (6 - i) * 7 * DAY);
    const thursday = new Date(start.getTime() + 3 * DAY);
    const year = thursday.getUTCFullYear();
    const week = Math.ceil(((thursday.getTime() - Date.UTC(year, 0, 1)) / DAY + 1) / 7);
    return {
      start: dateOnly(start),
      day: i === 6 ? dateOnly(today) : dateOnly(new Date(start.getTime() + 6 * DAY)),
      label: `W${week}`,
      key: `${year}-W${String(week).padStart(2, '0')}`,
    };
  });
}

export function lastMonths(now: Date): OverviewInterval[] {
  const vn = vnDate(now);
  return Array.from({ length: 7 }, (_, i) => {
    const first = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth() - 6 + i, 1));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
    return {
      start: dateOnly(first),
      day: i === 6 ? dateOnly(vn) : dateOnly(last),
      label: `T${first.getUTCMonth() + 1}`,
      key: dateOnly(first).slice(0, 7),
    };
  });
}

export function lastYears(now: Date): OverviewInterval[] {
  const vn = vnDate(now);
  return Array.from({ length: 5 }, (_, i) => {
    const year = vn.getUTCFullYear() - 4 + i;
    return {
      start: `${year}-01-01`,
      day: i === 4 ? dateOnly(vn) : `${year}-12-31`,
      label: String(year),
      key: String(year),
    };
  });
}

/** Half-open VN calendar interval preserves PostgreSQL microsecond boundaries. */
export function overviewRange(now: Date, query?: AdminOverviewQuery) {
  const today = dateOnly(vnDate(now));
  const from = query?.from ?? `${today.slice(0, 8)}01`;
  const to = query?.to ?? today;
  const start = new Date(`${from}T00:00:00+07:00`);
  const end = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + DAY);
  return { from, to, start, end };
}

export const deltaPct = (total: number, fresh: number): number =>
  total - fresh > 0 ? Math.round((fresh / (total - fresh)) * 1000) / 10 : 0;
