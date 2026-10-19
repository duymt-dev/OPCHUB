/** Tiện ích chung cho mock theo domain */

/** Mốc "bây giờ" cố định để dữ liệu và ảnh chụp parity ổn định (khớp seed: 16/10/2026) */
export const MOCK_NOW = Date.UTC(2026, 9, 16, 8, 30);
export const DAY_MS = 864e5;
const VN_OFFSET_H = 7;

export const iso = (ms: number) => new Date(ms).toISOString();

/** "dd/mm/yyyy" (00:00 giờ VN) → ISO UTC */
export function isoFromVnDate(d: string): string {
  const [dd = '1', mm = '1', yyyy = '2026'] = d.split('/');
  return iso(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), -VN_OFFSET_H));
}

/** "T5, 22/10" + "19:30" (giờ VN) → ISO UTC */
export function isoFromVnDayTime(day: string, time: string, year = 2026): string {
  const [, dm = '1/1'] = day.split(', ');
  const [dd = '1', mm = '1'] = dm.split('/');
  const [hh = '0', mi = '0'] = time.split(':');
  return iso(Date.UTC(year, Number(mm) - 1, Number(dd), Number(hh) - VN_OFFSET_H, Number(mi)));
}

/** "09:12" → hôm nay (giờ VN); chuỗi khác ('Hôm qua') → một ngày trước */
export function isoFromClock(time: string): string {
  if (!/^\d{1,2}:\d{2}$/.test(time)) return iso(MOCK_NOW - DAY_MS);
  const [hh = '0', mi = '0'] = time.split(':');
  const d = new Date(MOCK_NOW);
  return iso(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      Number(hh) - VN_OFFSET_H,
      Number(mi),
    ),
  );
}

/** Ảnh mẫu của prototype (D-36: tự host trước go-live) */
export const avatarUrl = (ph: string | null | undefined) =>
  ph ? `https://randomuser.me/api/portraits/${ph}.jpg` : null;

export const includesText = (v: string, q: string | undefined) =>
  !q || v.toLowerCase().includes(q.toLowerCase());

type MockErrorCode = 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_ERROR';

/** Kết quả thao tác mock — handler đổi sang HTTP */
export type MockResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409; code: MockErrorCode; message: string };

export const ok = <T>(data: T): MockResult<T> => ({ ok: true, data });

export const notFound = (message = 'Không tìm thấy'): MockResult<never> => ({
  ok: false,
  status: 404,
  code: 'NOT_FOUND',
  message,
});

export const conflict = (message: string): MockResult<never> => ({
  ok: false,
  status: 409,
  code: 'CONFLICT',
  message,
});

/** Cursor list mới → cũ; cursor là id phần tử cuối của trang trước */
export function cursorSlice<T extends { id: string }>(
  newestFirst: T[],
  cursor: string | undefined,
  size: number,
) {
  const start = cursor ? newestFirst.findIndex((x) => x.id === cursor) + 1 : 0;
  const items = newestFirst.slice(start, start + size);
  const more = start + size < newestFirst.length;
  return { items, nextCursor: more ? (items[items.length - 1]?.id ?? null) : null };
}
