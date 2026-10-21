import { intlLocaleOf } from './locales';

/**
 * Locale `Intl` hiện hành cho các hàm định dạng thuần (D-65). `LocaleSync` đặt giá trị trong lúc
 * render (trước mọi component con) nên server và client định dạng giống nhau.
 */
let current = intlLocaleOf('vi');

export const setFormatLocale = (code: string) => {
  current = intlLocaleOf(code);
};
export const formatLocale = () => current;

/** 1248 → "1.248" (vi) / "1,248" (en) */
export const fmtInt = (n: number) => n.toLocaleString(current);

/**
 * Số lớn dạng gọn: tiếng Việt giữ chữ của prototype ("2 tỷ", "1,5 tỷ", "100 triệu");
 * ngôn ngữ khác theo `Intl` compact (vd en "2B", "100M").
 */
export function fmtCompact(v: number): string {
  if (current.startsWith('vi')) {
    if (v >= 1e9) return `${(v / 1e9).toFixed(v % 1e9 ? 1 : 0).replace('.', ',')} tỷ`;
    return `${Math.round(v / 1e6)} triệu`;
  }
  return new Intl.NumberFormat(current, { notation: 'compact', maximumFractionDigits: 1 }).format(
    v,
  );
}

export interface EventDay {
  /** Thứ viết tắt: "T5" (vi) / "Thu" (en) */
  dow: string;
  /** Ngày trong tháng: "22" */
  dnum: string;
  /** "T5, 22/10" (vi) / "Thu, 22/10" (en-GB) */
  day: string;
}

/**
 * Ngày sự kiện theo ngôn ngữ (D-65). Tiếng Việt giữ chuỗi `day` server gửi ("T5, 22/10"); ngôn
 * ngữ khác dựng lại từ `startsAt` theo giờ VN (server chỉ có thứ viết tắt tiếng Việt).
 */
export function eventDay(startsAt: string, serverDay: string): EventDay {
  if (current.startsWith('vi')) {
    const [dow = '', date = ''] = serverDay.split(',').map((x) => x.trim());
    return { dow, dnum: date.split('/')[0] ?? '', day: serverDay };
  }
  const d = new Date(startsAt);
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(current, { timeZone: 'Asia/Ho_Chi_Minh', ...o }).format(d);
  const dow = fmt({ weekday: 'short' });
  return {
    dow,
    dnum: fmt({ day: 'numeric' }),
    day: `${dow}, ${fmt({ day: '2-digit', month: '2-digit' })}`,
  };
}
