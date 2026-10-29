/** BR-05: kỳ mới nối tiếp `max(valid_until, now)` + 12 tháng */
export function nextPeriod(validUntil: Date | null, now: Date): { startsAt: Date; endsAt: Date } {
  const startsAt = validUntil && validUntil > now ? validUntil : now;
  return { startsAt, endsAt: addMonths(startsAt, 12) };
}

/** Cộng tháng theo UTC; ngày 31 sang tháng ngắn thì lùi về ngày cuối tháng (29/02 → 28/02) */
export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime());
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + months);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

/** "+84912345678" → "0912345678" (§28.1 — một hàm dùng chung ở shared) */
export { localPhone } from '@opchub/shared';
