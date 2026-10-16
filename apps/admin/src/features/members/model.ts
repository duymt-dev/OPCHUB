import type { AdminMember, GroupItem } from '@opchub/shared/api-domains';
import { tones, type ToneName } from '@opchub/ui';
import type { GroupChip, GroupLookup } from './types';

/** Thứ tự tone theo prototype: TK = Object.keys(TONES), nhóm thứ i dùng TK[i % 5] */
const TONE_ORDER: ToneName[] = ['blue', 'rose', 'green', 'amber', 'violet'];

export function groupLookup(list: GroupItem[]): GroupLookup {
  const byId = new Map<string, GroupChip>(
    list.map((g, i) => {
      const t = tones[TONE_ORDER[i % TONE_ORDER.length] ?? 'blue'];
      return [g.id, { id: g.id, name: g.name, bg: t.bg, fg: t.fg }];
    }),
  );
  return { list, chipOf: (id) => byId.get(id) ?? null };
}

/** Nhóm đầu tiên hiện chip, phần còn lại gộp "+N" */
export function splitGroups(ids: string[], lookup: GroupLookup, shown = 2) {
  const chips = ids.map((id) => lookup.chipOf(id)).filter((c): c is GroupChip => c !== null);
  return { chips: chips.slice(0, shown), more: Math.max(0, chips.length - shown), all: chips };
}

const DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/** ISO UTC → "dd/mm/yyyy" giờ Việt Nam */
export const formatDate = (iso: string) => DATE_FMT.format(new Date(iso));

/** Dòng phụ dưới nhãn loại: DN → tên công ty; cá nhân → "Bạn là" */
export const subOf = (m: AdminMember) =>
  m.business ? m.business.companyName || m.organization : m.persona;

export const flagSrc = (country: string) => `https://flagcdn.com/w80/${country.toLowerCase()}.png`;

/** Chọn tất cả trên trang: chưa chọn hết → chọn hết; đã chọn hết → bỏ hết */
export function toggleAll(selected: ReadonlySet<string>, pageIds: string[]): Set<string> {
  const next = new Set(selected);
  const all = pageIds.length > 0 && pageIds.every((id) => next.has(id));
  pageIds.forEach((id) => (all ? next.delete(id) : next.add(id)));
  return next;
}

export type CheckState = 'none' | 'some' | 'all';

export function pageCheckState(selected: ReadonlySet<string>, pageIds: string[]): CheckState {
  const n = pageIds.filter((id) => selected.has(id)).length;
  if (n === 0) return 'none';
  return n === pageIds.length ? 'all' : 'some';
}
