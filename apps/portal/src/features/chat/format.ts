import { fmtInt, formatLocale } from '@/i18n/format';

/** Định dạng hiển thị của Chat nhóm — giờ theo Asia/Ho_Chi_Minh (luật 9) */

const TZ = 'Asia/Ho_Chi_Minh';

const dayKey = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, dateStyle: 'short' }).format(d);

/** "09:12" nếu cùng ngày với `now`, ngược lại nhãn `yesterday` */
export function messageTime(iso: string, yesterday: string, now = new Date()): string {
  const d = new Date(iso);
  if (dayKey(d) !== dayKey(now)) return yesterday;
  return new Intl.DateTimeFormat(formatLocale(), {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/** "15/10/2026" */
export const vnDate = (iso: string) =>
  new Intl.DateTimeFormat(formatLocale(), {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));

/** 1248 → "1.248" */
export const fmtNumber = fmtInt;

/** Tên rút gọn trên rail: bỏ tiền tố "OPC " */
export const shortGroupName = (name: string) => name.replace(/^OPC\s+/, '');

/** Từ cuối của họ tên ("Nguyễn Văn An" → "An") cho dòng tin cuối */
export const lastWord = (name: string) => name.split(' ').pop() ?? name;

export type TextToken =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; text: string; me: boolean }
  | { kind: 'hit'; text: string };

const MENTION = /(@[A-ZÀ-Ỹa-zà-ỹ]+(?: [A-ZÀ-Ỹ][a-zà-ỹ]+){0,3})/g;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function splitHits(text: string, q: string): TextToken[] {
  if (!q) return [{ kind: 'text', text }];
  return text
    .split(new RegExp(`(${escapeRe(q)})`, 'ig'))
    .filter(Boolean)
    .map((x) =>
      x.toLowerCase() === q.toLowerCase() ? { kind: 'hit', text: x } : { kind: 'text', text: x },
    );
}

/** Tách nội dung tin: @nhắc tên (đánh dấu nếu nhắc tới mình) + đoạn khớp tìm kiếm */
export function tokenize(text: string, me: string, q: string): TextToken[] {
  const out: TextToken[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION)) {
    const at = m.index;
    if (at > last) out.push(...splitHits(text.slice(last, at), q));
    const name = m[0].slice(1);
    out.push({ kind: 'mention', text: m[0], me: name === me || me.endsWith(name) });
    last = at + m[0].length;
  }
  if (last < text.length) out.push(...splitHits(text.slice(last), q));
  return out;
}

/** Tên được @nhắc trong bản nháp, chỉ giữ người có trong danh sách */
export function mentionedNames(draft: string, people: string[]): string[] {
  return [...draft.matchAll(MENTION)].map((m) => m[0].slice(1)).filter((n) => people.includes(n));
}

/** Đoạn sau "@" cuối cùng của bản nháp (null = không đang nhắc tên) */
export function mentionQuery(draft: string): string | null {
  const m = /@([^@\s]*)$/.exec(draft);
  return m ? (m[1] ?? '').toLowerCase() : null;
}

export const applyMention = (draft: string, name: string) =>
  draft.replace(/@[^@\s]*$/, `@${name} `);

/** Chèn "@" vào cuối bản nháp, thêm khoảng trắng nếu cần */
export const insertAt = (draft: string) =>
  draft + (draft === '' || draft.endsWith(' ') ? '' : ' ') + '@';
