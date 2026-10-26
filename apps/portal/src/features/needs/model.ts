import type {
  NEED_CHANNELS,
  NEED_COOPERATION,
  NEED_SCOPES,
  NEED_STANDARDS,
} from '@opchub/shared/api-domains';
import {
  NEED_FIELD_OTHER,
  type Need,
  type NeedCreateInput,
  type NeedType,
  type StoreNeed,
} from '@opchub/shared/api-domains';

/** Màu chip loại nhu cầu — prototype `NT` (nền / chữ / viền) */
const TYPE_COLORS: Record<NeedType, readonly [string, string, string]> = {
  buy: ['#E6F4FF', '#0958D9', '#91CAFF'],
  sell: ['#F6FFED', '#389E0D', '#B7EB8F'],
  partner: ['#F9F0FF', '#531DAB', '#D3ADF7'],
  service: ['#FFF7E6', '#D46B08', '#FFD591'],
  solution: ['#E6FFFB', '#08979C', '#87E8DE'],
  staff: ['#FFF0F6', '#C41D7F', '#FFADD2'],
  space: ['#FCFFE6', '#5B8C00', '#D3F261'],
  capital: ['#FFFBE6', '#D48806', '#FFE58F'],
  other: ['#FAFAFA', 'rgba(0,0,0,0.65)', '#D9D9D9'],
};

export const typeStyle = (t: NeedType) => {
  const [background, color, borderColor] = TYPE_COLORS[t];
  return { background, color, borderColor };
};

export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

/** "Hạn dd/mm/yyyy" / "Không thời hạn" — `labels` lấy từ i18n */
export const dueText = (n: Pick<StoreNeed, 'dueAt'>, labels: { due: string; none: string }) =>
  n.dueAt ? `${labels.due} ${formatDay(n.dueAt)}` : labels.none;

export const locationOf = (n: Pick<Need, 'ward' | 'province'>) =>
  [n.ward, n.province].filter(Boolean).join(', ');

/** Ngân sách như prototype: "1.000.000 – 3.000.000 đ"; cả hai rỗng → null (ẩn dòng) */
export function budgetText(n: Pick<Need, 'budgetMin' | 'budgetMax'>): string | null {
  const parts = [n.budgetMin, n.budgetMax]
    .filter((v): v is number => v !== null)
    .map((v) => v.toLocaleString('vi-VN'));
  return parts.length ? `${parts.join(' – ')} đ` : null;
}

/** Link "Gợi ý" → Khám phá gian hàng lọc đúng ngành (+ tỉnh khi có gian hàng cùng tỉnh) */
export function suggestionHref(n: Pick<Need, 'field' | 'province' | 'suggestion'>): string {
  const p = new URLSearchParams({ field: n.field });
  if (n.suggestion?.sameProvince && n.province) p.set('province', n.province);
  return `/stores?${p.toString()}`;
}

export const storeInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

export function zaloLink(phone: string): string | null {
  const d = phone.replace(/\D/g, '');
  if (d.length < 8) return null;
  return `https://zalo.me/${d.startsWith('84') ? `0${d.slice(2)}` : d}`;
}

export const telLink = (phone: string) => {
  const d = phone.replace(/[^\d+]/g, '');
  return d.replace(/\D/g, '').length >= 8 ? `tel:${d}` : null;
};

/* ── Form "Đăng nhu cầu" ── */

export type Cooperation = (typeof NEED_COOPERATION)[number];
export type Standard = (typeof NEED_STANDARDS)[number];

export interface NeedDraft {
  type: NeedType;
  title: string;
  field: string;
  fieldCustom: string;
  description: string;
  qty: string;
  unit: string;
  budgetMin: string;
  budgetMax: string;
  negotiable: boolean;
  province: string;
  ward: string;
  dueDate: string;
  scope: (typeof NEED_SCOPES)[number];
  cooperation: Cooperation[];
  standards: Standard[];
  docUrl: string;
  contactName: string;
  phone: string;
  email: string;
  channel: (typeof NEED_CHANNELS)[number];
}

type DraftInit = Partial<Pick<NeedDraft, 'province' | 'contactName' | 'email'>>;

/** Mặc định như `openForm` của prototype: tỉnh của gian hàng, liên hệ của chủ tài khoản */
export const emptyDraft = (init: DraftInit = {}): NeedDraft => ({
  type: 'buy',
  title: '',
  field: '',
  fieldCustom: '',
  description: '',
  qty: '',
  unit: '',
  budgetMin: '',
  budgetMax: '',
  negotiable: false,
  province: init.province ?? '',
  ward: '',
  dueDate: '',
  scope: 'province',
  cooperation: [],
  standards: [],
  docUrl: '',
  contactName: init.contactName ?? '',
  phone: '',
  email: init.email ?? '',
  channel: 'zalo',
});

const money = (v: string) => {
  const d = v.replace(/\D/g, '');
  return d ? Number(d) : null;
};

export type DraftIssue = 'title' | 'field' | 'fieldCustom' | 'desc' | 'contact' | 'budget';

/** Kiểm theo đúng thứ tự `save` của prototype — trả lỗi đầu tiên (toast) hoặc null */
export function draftIssue(d: NeedDraft, descMin: number): DraftIssue | null {
  if (!d.title.trim()) return 'title';
  if (!d.field) return 'field';
  if (d.field === NEED_FIELD_OTHER && !d.fieldCustom.trim()) return 'fieldCustom';
  if (d.description.trim().length < descMin) return 'desc';
  if (!d.phone.trim() && !d.email.trim()) return 'contact';
  const lo = money(d.budgetMin);
  const hi = money(d.budgetMax);
  if (!d.negotiable && lo !== null && hi !== null && lo >= hi) return 'budget';
  return null;
}

/** Bản nháp → body POST /me/needs; "Thỏa thuận" = không gửi ngân sách */
export function toCreate(d: NeedDraft): NeedCreateInput {
  return {
    type: d.type,
    title: d.title.trim(),
    field: d.field,
    fieldCustom: d.field === NEED_FIELD_OTHER ? d.fieldCustom.trim() : '',
    description: d.description.trim(),
    quantity: [d.qty.trim(), d.unit.trim()].filter(Boolean).join(' '),
    budgetMin: d.negotiable ? null : money(d.budgetMin),
    budgetMax: d.negotiable ? null : money(d.budgetMax),
    province: d.province.trim(),
    ward: d.ward.trim(),
    dueDate: d.dueDate || null,
    scope: d.scope,
    cooperation: d.cooperation,
    standards: d.standards,
    docUrl: d.docUrl.trim(),
    contactName: d.contactName.trim(),
    phone: d.phone.trim(),
    email: d.email.trim(),
    channel: d.channel,
  };
}

/** Bật / tắt 1 lựa chọn của nhóm chọn nhiều */
export const toggleIn = <T>(list: readonly T[], v: T): T[] =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
