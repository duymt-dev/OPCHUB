import type { AdminMember, GroupItem } from '@opchub/shared/api-domains';
import { tones, type ToneName } from '@opchub/ui';
import type { GroupChip, GroupLookup } from './types';
import { formatDate as displayDate } from '@/i18n/format';

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

/** ISO UTC → "dd/mm/yyyy" giờ Việt Nam */
export const formatDate = (iso: string, locale = 'vi') => displayDate(iso, locale);

/** Dòng phụ dưới nhãn loại: DN → tên công ty; cá nhân → "Bạn là" */
export const subOf = (m: AdminMember) =>
  m.business ? m.business.companyName || m.organization : m.persona;

export const flagSrc = (country: string) => `https://flagcdn.com/w80/${country.toLowerCase()}.png`;

/** Chữ viết tắt như `ini` của prototype: chữ đầu của từ đầu + từ cuối ("Đỗ Hải Yến" → "ĐY") */
export function memberInitials(name: string): string {
  const w = (name || '?').trim().split(/\s+/);
  const first = w[0] ?? '?';
  return (
    w.length > 1 ? `${first[0]}${w[w.length - 1]?.[0] ?? ''}` : first.slice(0, 2)
  ).toUpperCase();
}

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
