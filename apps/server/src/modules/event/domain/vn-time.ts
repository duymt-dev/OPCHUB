/** Hiển thị theo Asia/Ho_Chi_Minh (UTC+7, không DST) — luật 9 */
const VN_OFFSET_MS = 7 * 3600 * 1000;
const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;
const pad = (n: number) => String(n).padStart(2, '0');

const vn = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS);

/** `"T5, 22/10"` */
export function vnDayLabel(d: Date): string {
  const v = vn(d);
  return `${DOW[v.getUTCDay()] ?? ''}, ${pad(v.getUTCDate())}/${pad(v.getUTCMonth() + 1)}`;
}

/** `"19:30"` */
export function vnTime(d: Date): string {
  const v = vn(d);
  return `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`;
}

/** `ends_at` = cùng ngày VN với `startsAt`, giờ `hh:mm` (qua nửa đêm → ngày hôm sau) */
export function endsAtOf(startsAt: Date, hhmm: string | null): Date | null {
  if (!hhmm) return null;
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const v = vn(startsAt);
  const end = Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate(), h, m) - VN_OFFSET_MS;
  return new Date(end < startsAt.getTime() ? end + 24 * 3600 * 1000 : end);
}

/** `"YYYY-MM-DD"` theo ngày VN */
export function vnIsoDate(d: Date): string {
  return vn(d).toISOString().slice(0, 10);
}
