import { describe, expect, it } from 'vitest';
import {
  emptyGroupForm,
  exportCell,
  filterGroups,
  formToUpsert,
  groupStats,
  initialsOf,
  nameForProvince,
  pageSlice,
  validateGroup,
  type CellLabels,
} from './model';
import type { AdminGroup, GroupMemberRow, GroupsParams } from './types';

const g = (id: string, name: string, province: string, region: string, m: number, w: number) =>
  ({
    id,
    name,
    province,
    region,
    memberCount: m,
    weeklyActive: w,
    description: '',
    joinMode: 'open',
    myStatus: null,
    order: Number(id.slice(1)),
  }) satisfies AdminGroup;

const ALL = [
  g('c1', 'OPC Hà Nội', 'Hà Nội', 'Miền Bắc', 1248, 842),
  g('c2', 'OPC TP. Hồ Chí Minh', 'TP. Hồ Chí Minh', 'Miền Nam', 1532, 1210),
  g('c3', 'OPC Đà Nẵng', 'Đà Nẵng', 'Miền Trung', 654, 390),
];
const P: GroupsParams = {
  tab: 'list',
  view: 'grid',
  region: 'all',
  q: '',
  sort: 'members',
  page: 1,
  size: 12,
  rep: 'all',
};

describe('lọc / sắp xếp nhóm', () => {
  it('mặc định nhiều thành viên trước', () => {
    expect(filterGroups(ALL, P).map((x) => x.id)).toEqual(['c2', 'c1', 'c3']);
  });
  it('lọc miền + tìm theo tên hoặc tỉnh, không phân biệt hoa thường', () => {
    expect(filterGroups(ALL, { ...P, region: 'Miền Trung' }).map((x) => x.id)).toEqual(['c3']);
    expect(filterGroups(ALL, { ...P, q: 'hà nội' }).map((x) => x.id)).toEqual(['c1']);
    expect(filterGroups(ALL, { ...P, q: 'zzzz' })).toEqual([]);
  });
  it('sắp xếp theo tên tiếng Việt và hoạt động', () => {
    expect(filterGroups(ALL, { ...P, sort: 'name' })[0]?.id).toBe('c3');
    expect(filterGroups(ALL, { ...P, sort: 'weekly' })[0]?.id).toBe('c2');
  });
  it('thống kê và phân trang kẹp trang vượt', () => {
    expect(groupStats(ALL)).toEqual({ groups: 3, provinces: 3, members: 3434, weekly: 2442 });
    expect(pageSlice(ALL, 9, 2)).toEqual({ page: 2, items: [ALL[2]] });
  });
  it('chữ viết tắt hai từ cuối', () => {
    expect(initialsOf('OPC Hà Nội')).toBe('HN');
    expect(initialsOf('OPC TP. Hồ Chí Minh')).toBe('CM');
  });
});

describe('form nhóm', () => {
  it('kiểm lỗi đúng thứ tự prototype', () => {
    const f = emptyGroupForm();
    expect(validateGroup(f, ALL)).toBe('name');
    expect(validateGroup({ ...f, name: 'X' }, ALL)).toBe('province');
    expect(validateGroup({ ...f, name: 'X', province: 'Hà Nội' }, ALL)).toBe('duplicate');
    expect(validateGroup({ ...f, name: 'X', province: 'Huế' }, ALL)).toBe('desc');
    expect(
      validateGroup({ ...f, name: 'X', province: 'Huế', description: 'd', ownerId: '' }, ALL),
    ).toBe('owner');
    // Sửa nhóm cùng tỉnh không báo trùng
    expect(
      validateGroup({ ...f, id: 'c1', name: 'X', province: 'Hà Nội', description: 'd' }, ALL),
    ).toBeNull();
  });
  it('tự điền tên theo tỉnh khi tên trống hoặc tự sinh', () => {
    expect(nameForProvince('', 'Huế')).toBe('OPC Huế');
    expect(nameForProvince('OPC Huế', 'Đà Nẵng')).toBe('OPC Đà Nẵng');
    expect(nameForProvince('Nhóm riêng', 'Huế')).toBe('Nhóm riêng');
  });
  it('bỏ nội quy / phòng rỗng khi gửi', () => {
    const body = formToUpsert({
      ...emptyGroupForm(),
      name: ' A ',
      province: 'Huế',
      description: 'd',
      approval: true,
      rules: ['x', ' '],
      extraRooms: [
        { name: '', description: 'a' },
        { name: 'r', description: '' },
      ],
    });
    expect(body).toMatchObject({ name: 'A', joinMode: 'approval', rules: ['x'] });
    expect(body.extraRooms).toEqual([{ name: 'r', description: '' }]);
  });
});

describe('ô xuất', () => {
  const L: CellLabels = {
    business: 'Doanh nghiệp',
    personal: 'Cá nhân',
    owner: 'Chủ nhóm',
    moderator: 'Điều phối viên',
    member: 'Thành viên',
    active: 'Hoạt động',
    locked: 'Đã khóa',
  };
  const r: GroupMemberRow = {
    groupId: 'c1',
    groupName: 'OPC Hà Nội',
    userId: 'm1',
    fullName: 'Nguyễn Văn An',
    email: 'a@b.c',
    phone: '1',
    accountType: 'business',
    company: 'X',
    taxCode: '',
    groupRole: 'owner',
    country: 'Việt Nam',
    joinedAt: '2026-03-01T17:00:00.000Z',
    status: 'active',
  };
  it('đổi enum sang nhãn và ngày theo giờ VN', () => {
    expect(exportCell(r, 'type', L)).toBe('Doanh nghiệp');
    expect(exportCell(r, 'grole', L)).toBe('Chủ nhóm');
    expect(exportCell(r, 'date', L)).toBe('02/03/2026');
  });
});
