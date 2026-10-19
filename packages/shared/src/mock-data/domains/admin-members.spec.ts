import { beforeEach, describe, expect, it } from 'vitest';
import { adminMemberSchema } from '../../api-domains';
import { decideBizVerification, listAdminMembers, resetMockDb, setUsersStatus } from './index';

describe('mock Thành viên (admin)', () => {
  beforeEach(() => resetMockDb());

  it('liệt kê theo seed, đếm theo loại, đúng schema', () => {
    const r = listAdminMembers(undefined, undefined);
    expect(r.items).toHaveLength(8);
    expect(r.counts).toEqual({ all: 8, business: 4, personal: 4 });
    r.items.forEach((m) => adminMemberSchema.parse(m));
    expect(r.items.find((m) => m.id === 'm4')).toMatchObject({ status: 'locked' });
  });

  it('D-63 MSW sắp xếp khớp server: ngày tham gia mới nhất lên đầu', () => {
    const ids = listAdminMembers(undefined, undefined).items.map((m) => m.id);
    expect(ids).toEqual(['m7', 'm5', 'm8', 'm6', 'm2', 'm1', 'm3', 'm4']);
  });

  it('lọc loại + tìm theo tên/email/công ty', () => {
    expect(listAdminMembers('business', undefined).items).toHaveLength(4);
    expect(listAdminMembers(undefined, 'solobooks').items.map((m) => m.id)).toEqual(['m3']);
    expect(listAdminMembers(undefined, 'zzzz').items).toHaveLength(0);
  });

  it('RB-R01 không còn vai trò quản trị trên thành viên; khoá hàng loạt idempotent', () => {
    expect(listAdminMembers(undefined, undefined).items.some((m) => 'systemRole' in m)).toBe(false);
    expect(setUsersStatus(['m2', 'm4'], 'locked')).toMatchObject({ data: { updated: 1 } });
    expect(setUsersStatus(['m2', 'm4'], 'active')).toMatchObject({ data: { updated: 2 } });
  });

  it('xác minh DN chỉ khi đang chờ (D-40)', () => {
    expect(decideBizVerification('m1', 'approve')).toMatchObject({ ok: false, code: 'CONFLICT' });
    expect(decideBizVerification('m2', 'approve')).toMatchObject({ ok: false, code: 'CONFLICT' });
    const r = decideBizVerification('m7', 'approve');
    expect(r.ok && r.data.business?.verification).toBe('verified');
    expect(decideBizVerification('m7', 'reject')).toMatchObject({ ok: false });
  });
});
