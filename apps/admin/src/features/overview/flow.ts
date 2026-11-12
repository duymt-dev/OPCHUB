import type { AdminOverview } from '@opchub/shared/api-domains';
import { formatNumber } from '@/i18n/format';

export type FlowKey = 'fees' | 'stores' | 'needs' | 'projects' | 'groups';

export interface FlowCard {
  key: FlowKey;
  href: string;
  /** Giá trị chính đã định dạng ("1 / 8", "17") */
  value: string;
  /** Tham số cho dòng phụ i18n `flow.<key>.sub` */
  sub: Record<string, number>;
  /** "Hoàn tất" (xanh) / "Cần làm" (vàng) — prototype: chỉ thẻ dự án đổi theo số chờ duyệt */
  done: boolean;
}

/** D-89 v4 "Luồng hệ thống" (prototype `FLOW.admin`): 5 thẻ theo thứ tự prototype */
export function flowCards(f: AdminOverview['flow'], locale = 'vi'): FlowCard[] {
  const number = (value: number) => formatNumber(value, locale);
  return [
    {
      key: 'fees',
      href: '/fees',
      value: `${number(f.paidMembers)} / ${number(f.members)}`,
      sub: {},
      done: true,
    },
    {
      key: 'stores',
      href: '/stores',
      value: number(f.stores.published),
      sub: { hidden: f.stores.hidden, draft: f.stores.draft },
      done: true,
    },
    {
      key: 'needs',
      href: '/needs',
      value: number(f.needs.open),
      sub: { closed: f.needs.closed },
      done: true,
    },
    {
      key: 'projects',
      href: '/projects?tab=pending',
      value: number(f.projects.pending),
      sub: { published: f.projects.published },
      done: f.projects.pending === 0,
    },
    { key: 'groups', href: '/groups', value: number(f.groups), sub: {}, done: true },
  ];
}

/** Plain ICU placeholders are strings; preserve raw numeric card parameters for business callers. */
export function flowTextParams(sub: FlowCard['sub'], locale: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(sub).map(([key, value]) => [key, formatNumber(value, locale)]),
  );
}
