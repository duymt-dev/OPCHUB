import type { AdminNeed, NeedStatus, NeedType } from '@opchub/shared/api-domains';

interface Tone {
  bg: string;
  fg: string;
  bd: string;
}

/** Prototype `NT`: màu thẻ loại nhu cầu (nhãn ở `needs.type.*`) */
export const NEED_TONE: Record<NeedType, Tone> = {
  buy: { bg: '#E6F4FF', fg: '#0958D9', bd: '#91CAFF' },
  sell: { bg: '#F6FFED', fg: '#389E0D', bd: '#B7EB8F' },
  partner: { bg: '#F9F0FF', fg: '#531DAB', bd: '#D3ADF7' },
  service: { bg: '#FFF7E6', fg: '#D46B08', bd: '#FFD591' },
  solution: { bg: '#E6FFFB', fg: '#08979C', bd: '#87E8DE' },
  staff: { bg: '#FFF0F6', fg: '#C41D7F', bd: '#FFADD2' },
  space: { bg: '#FCFFE6', fg: '#5B8C00', bd: '#D3F261' },
  capital: { bg: '#FFFBE6', fg: '#D48806', bd: '#FFE58F' },
  other: { bg: '#FAFAFA', fg: 'rgba(0,0,0,0.65)', bd: '#D9D9D9' },
};

/** Prototype `NSL`: Đang mở / Đã đóng / Admin đã ẩn */
export const NEED_STATUS_TONE: Record<NeedStatus, Tone> = {
  open: { bg: '#F6FFED', fg: '#389E0D', bd: '#B7EB8F' },
  closed: { bg: '#FAFAFA', fg: 'rgba(0,0,0,0.65)', bd: '#D9D9D9' },
  hidden: { bg: '#FFF1F0', fg: '#CF1322', bd: '#FFA39E' },
};

const DATE = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});
export const needDate = (iso: string) => DATE.format(new Date(iso));

/** Prototype `r.qty · r.mf` — bỏ phần trống (nhu cầu không ghi số lượng) */
export const needSub = (n: Pick<AdminNeed, 'quantity' | 'field'>) =>
  [n.quantity.trim(), n.field].filter(Boolean).join(' · ');

/** Prototype `loc`: "phường, tỉnh" */
export const needLoc = (n: Pick<AdminNeed, 'ward' | 'province'>) =>
  [n.ward, n.province].filter(Boolean).join(', ');

export const allChecked = (sel: ReadonlySet<string>, pageIds: readonly string[]) =>
  pageIds.length > 0 && pageIds.every((id) => sel.has(id));

/** Chọn tất cả chỉ trên trang hiện tại (prototype `togAll`) */
export function toggleAll(sel: ReadonlySet<string>, pageIds: readonly string[]): Set<string> {
  const all = allChecked(sel, pageIds);
  const next = new Set(sel);
  for (const id of pageIds) {
    if (all) next.delete(id);
    else next.add(id);
  }
  return next;
}
