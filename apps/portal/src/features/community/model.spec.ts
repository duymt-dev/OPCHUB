import type { GroupItem } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import { filterGroups, onlineOf, pageSlice, regionCounts, toCommunityGroups } from './model';
import type { CommunityParams } from './types';

const g = (
  id: string,
  name: string,
  region: string,
  members: number,
  weekly: number,
  s: GroupItem['myStatus'] = null,
): GroupItem => ({
  id,
  name,
  province: name,
  region,
  memberCount: members,
  weeklyActive: weekly,
  description: `Mô tả ${name}`,
  joinMode: 'open',
  myStatus: s,
});

const all = toCommunityGroups([
  g('c1', 'OPC Hà Nội', 'Miền Bắc', 1248, 842, 'member'),
  g('c2', 'OPC Đà Nẵng', 'Miền Trung', 654, 390),
  g('c3', 'OPC Cần Thơ', 'Miền Nam', 512, 1200, 'pending'),
  g('c4', 'OPC Bắc Ninh', 'Miền Bắc', 300, 10),
]);

const P: CommunityParams = {
  q: '',
  filter: 'all',
  region: 'all',
  sort: 'members',
  page: 1,
  size: 9,
};

describe('community model', () => {
  it('suy ra joined/pending từ myStatus', () => {
    expect(all.map((x) => [x.joined, x.pending])).toEqual([
      [true, false],
      [false, false],
      [false, true],
      [false, false],
    ]);
  });

  it('đếm chip khu vực theo thứ tự xuất hiện', () => {
    expect(regionCounts(all)).toEqual([
      { key: 'all', count: 4 },
      { key: 'Miền Bắc', count: 2 },
      { key: 'Miền Trung', count: 1 },
      { key: 'Miền Nam', count: 1 },
    ]);
  });

  it('lọc theo từ khoá (tên, vùng, mô tả), không phân biệt hoa thường', () => {
    expect(filterGroups(all, { ...P, q: 'đà nẵng' }).map((x) => x.id)).toEqual(['c2']);
    expect(filterGroups(all, { ...P, q: 'miền bắc' }).map((x) => x.id)).toEqual(['c1', 'c4']);
    expect(filterGroups(all, { ...P, q: 'zzzz' })).toEqual([]);
  });

  it('lọc Đã tham gia / Chưa tham gia và khu vực', () => {
    expect(filterGroups(all, { ...P, filter: 'joined' }).map((x) => x.id)).toEqual(['c1']);
    expect(filterGroups(all, { ...P, filter: 'not' }).map((x) => x.id)).toEqual(['c2', 'c3', 'c4']);
    expect(filterGroups(all, { ...P, region: 'Miền Bắc' }).map((x) => x.id)).toEqual(['c1', 'c4']);
  });

  it('sắp xếp nhiều thành viên / hoạt động / tên A–Z', () => {
    expect(filterGroups(all, P).map((x) => x.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(filterGroups(all, { ...P, sort: 'active' }).map((x) => x.id)).toEqual([
      'c3',
      'c1',
      'c2',
      'c4',
    ]);
    expect(filterGroups(all, { ...P, sort: 'name' }).map((x) => x.name)).toEqual([
      'OPC Bắc Ninh',
      'OPC Cần Thơ',
      'OPC Đà Nẵng',
      'OPC Hà Nội',
    ]);
  });

  it('cắt trang và kẹp trang vượt tổng', () => {
    const list = Array.from({ length: 34 }, (_, i) => i);
    expect(pageSlice(list, 2, 9)).toEqual({ page: 2, items: list.slice(9, 18) });
    expect(pageSlice(list, 99, 9).page).toBe(4);
    expect(pageSlice([], 3, 9)).toEqual({ page: 1, items: [] });
  });

  it('ước tính online 4%, tối thiểu 1', () => {
    expect(onlineOf(1532)).toBe(61);
    expect(onlineOf(5)).toBe(1);
  });
});
