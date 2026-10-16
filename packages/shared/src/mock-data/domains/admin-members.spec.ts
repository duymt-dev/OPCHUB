import { beforeEach, describe, expect, it } from 'vitest';
import { adminMemberSchema } from '../../api-domains';
import {
  decideBizVerification,
  listAdminMembers,
  resetMockDb,
  setMemberRole,
  setUsersStatus,
} from './index';

describe('mock Thành viên (admin)', () => {
  beforeEach(() => resetMockDb());

  it('liệt kê theo seed, đếm theo loại, đúng schema', () => {
    const r = listAdminMembers(undefined, undefined);
    expect(r.items).toHaveLength(8);
    expect(r.counts).toEqual({ all: 8, business: 4, personal: 4 });
    r.items.forEach((m) => adminMemberSchema.parse(m));
    expect(r.items[3]).toMatchObject({ id: 'm4', status: 'locked' });
  });

  it('lọc loại + tìm theo tên/email/công ty', () => {
    expect(listAdminMembers('business', undefined).items).toHaveLength(4);
    expect(listAdminMembers(undefined, 'solobooks').items.map((m) => m.id)).toEqual(['m3']);
    expect(listAdminMembers(undefined, 'zzzz').items).toHaveLength(0);
  });

  it('đổi vai trò, khoá hàng loạt idempotent', () => {
    expect(setMemberRole('m2', 'admin')).toMatchObject({ ok: true, data: { systemRole: 'admin' } });
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
