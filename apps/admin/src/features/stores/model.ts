import type { StoreItem, StoreStatus } from '@opchub/shared/api-domains';

/** Prototype `SL`: màu nền / chữ / viền thẻ trạng thái gian hàng */
export const STATUS_TONE: Record<StoreStatus, { bg: string; fg: string; bd: string }> = {
  published: { bg: '#F6FFED', fg: '#389E0D', bd: '#B7EB8F' },
  draft: { bg: '#FAFAFA', fg: 'rgba(0,0,0,0.65)', bd: '#D9D9D9' },
  hidden: { bg: '#FFF1F0', fg: '#CF1322', bd: '#FFA39E' },
};

const LEGAL =
  /(^|\s)(Công ty|CTCP|TNHH|Cổ phần|CP|Tập đoàn|Giải pháp|Hộ kinh doanh|MTV|HTX)(?=\s|$)/gi;

/** Prototype `ini`: chữ viết tắt khi gian hàng chưa có ảnh bìa */
export function storeInitials(name: string): string {
  const w = (name || '?').replace(LEGAL, ' ').split(/\s+/).filter(Boolean);
  if (w.length === 1) {
    const word = w[0] ?? '?';
    const caps = word.match(/[A-ZÀ-Ỹ]/g) ?? [];
    return (caps.length >= 2 ? caps.slice(0, 2).join('') : word.slice(0, 2)).toUpperCase();
  }
  return w
    .slice(0, 2)
    .map((x) => x[0] ?? '')
    .join('')
    .toUpperCase();
}

const DATE = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});
export const storeDate = (iso: string) => DATE.format(new Date(iso));

/** Giá item: số nguyên VND; `null` / 0 = "Liên hệ báo giá" (prototype `+i.price`) */
export const itemPrice = (i: Pick<StoreItem, 'price'>, contact: string) =>
  i.price ? `${i.price.toLocaleString('vi-VN')}đ` : contact;

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
