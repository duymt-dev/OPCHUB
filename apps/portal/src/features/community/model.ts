import type { GroupItem } from '@opchub/shared/api-domains';
import { tones, type ToneName } from '@opchub/ui';
import type { CommunityGroup, CommunityParams, RegionCount } from './types';

/** Lọc / sắp xếp danh sách cộng đồng (34 nhóm theo tỉnh — D-29, tải một lần) */

export function toCommunityGroups(items: GroupItem[]): CommunityGroup[] {
  return items.map((g, order) => ({
    ...g,
    order,
    joined: g.myStatus === 'member',
    pending: g.myStatus === 'pending',
  }));
}

const TONE_ORDER: ToneName[] = ['blue', 'rose', 'green', 'amber', 'violet'];
/** Tông màu nhãn khu vực theo thứ tự nhóm (như prototype) */
export const toneOf = (order: number) => tones[TONE_ORDER[order % TONE_ORDER.length] ?? 'blue'];

/** Chip KHU VỰC: "Tất cả" + từng vùng theo thứ tự xuất hiện */
export function regionCounts(all: CommunityGroup[]): RegionCount[] {
  const keys = [...new Set(all.map((g) => g.region))];
  return [
    { key: 'all', count: all.length },
    ...keys.map((key) => ({ key, count: all.filter((g) => g.region === key).length })),
  ];
}

const matches = (g: CommunityGroup, q: string) =>
  !q || `${g.name} ${g.region} ${g.description}`.toLowerCase().includes(q);

/** Áp bộ lọc + sắp xếp; phân trang làm ở component Pagination */
export function filterGroups(all: CommunityGroup[], p: CommunityParams): CommunityGroup[] {
  const q = p.q.trim().toLowerCase();
  const list = all.filter(
    (g) =>
      (p.region === 'all' || g.region === p.region) &&
      (p.filter === 'all' || (p.filter === 'joined' ? g.joined : !g.joined)) &&
      matches(g, q),
  );
  return list.sort((a, b) => {
    if (p.sort === 'name') return a.name.localeCompare(b.name, 'vi');
    if (p.sort === 'active') return b.weeklyActive - a.weeklyActive;
    return b.memberCount - a.memberCount;
  });
}

/** Trang hiện tại kẹp trong [1, số trang] */
export function pageSlice<T>(list: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const cur = Math.min(Math.max(1, page), pages);
  return { page: cur, items: list.slice((cur - 1) * size, cur * size) };
}

/** Số người đang online ước tính như prototype (4% thành viên, tối thiểu 1) */
export const onlineOf = (members: number) => Math.max(1, Math.round(members * 0.04));

export const formatCount = (n: number) => n.toLocaleString('vi-VN');
