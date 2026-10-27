import type { AdminOverview } from '@opchub/shared/api-domains';

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

const nf = new Intl.NumberFormat('vi-VN');

/** D-89 v4 "Luồng hệ thống" (prototype `FLOW.admin`): 5 thẻ theo thứ tự prototype */
export function flowCards(f: AdminOverview['flow']): FlowCard[] {
  return [
    {
      key: 'fees',
      href: '/fees',
      value: `${nf.format(f.paidMembers)} / ${nf.format(f.members)}`,
      sub: {},
      done: true,
    },
    {
      key: 'stores',
      href: '/stores',
      value: nf.format(f.stores.published),
      sub: { hidden: f.stores.hidden, draft: f.stores.draft },
      done: true,
    },
    {
      key: 'needs',
      href: '/needs',
      value: nf.format(f.needs.open),
      sub: { closed: f.needs.closed },
      done: true,
    },
    {
      key: 'projects',
      href: '/projects?tab=pending',
      value: nf.format(f.projects.pending),
      sub: { published: f.projects.published },
      done: f.projects.pending === 0,
    },
    { key: 'groups', href: '/groups', value: nf.format(f.groups), sub: {}, done: true },
  ];
}
