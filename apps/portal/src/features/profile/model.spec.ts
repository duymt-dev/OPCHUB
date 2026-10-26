import type { EventItem, GroupItem, Profile } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import {
  activityEvents,
  activityGroups,
  buildPatch,
  checkPassword,
  isEmail,
  monoOf,
  strengthBars,
  valuesOf,
  vnDate,
} from './model';

const profile: Profile = {
  id: 'm1',
  fullName: 'Nguyễn Văn An',
  email: 'an@x.vn',
  accountType: 'business',
  systemRole: 'member',
  status: 'active',
  avatarUrl: null,
  needsDeclaration: false,
  membershipFee: null,
  phone: { country: 'vn', number: '912 345 678' },
  persona: 'Doanh nghiệp',
  country: 'vn',
  city: '',
  bio: '',
  joinedAt: '2026-03-01T17:00:00.000Z',
  business: {
    taxCode: '0101234567',
    companyName: 'MediaSoft',
    field: 'Công nghệ thông tin',
    size: '2 – 10 người',
    position: 'Giám đốc',
    website: '',
    verification: 'verified',
  },
  stats: { groups: 3, events: 1, projects: 1 },
  linkedSso: ['google'],
  hasPassword: true,
};

describe('profile model', () => {
  it('valuesOf ghép hồ sơ + bản nháp', () => {
    const v = valuesOf(profile, { city: 'Hà Nội' });
    expect(v.city).toBe('Hà Nội');
    expect(v.phoneNumber).toBe('912 345 678');
    expect(v.taxCode).toBe('0101234567');
  });

  it('buildPatch báo họ tên trống (chữ prototype); BUG-030 email không vào PATCH', () => {
    expect(buildPatch(profile, { fullName: '  ' })).toEqual({
      ok: false,
      error: 'Họ và tên không được để trống',
    });
    expect(valuesOf(profile, {}).email).toBe('an@x.vn');
    expect(isEmail('abc')).toBe(false);
    expect(isEmail(' moi@x.vn ')).toBe(true);
  });

  it('buildPatch bỏ MST/tên DN khi đã xác minh (D-40), gom SĐT', () => {
    const r = buildPatch(profile, { taxCode: '999', field: 'Logistics', phoneNumber: '1' });
    expect(r).toEqual({
      ok: true,
      patch: { phone: { country: 'vn', number: '1' }, business: { field: 'Logistics' } },
    });
    const pending = {
      ...profile,
      business: { ...profile.business!, verification: 'pending' as const },
    };
    expect(buildPatch(pending, { taxCode: '999' })).toEqual({
      ok: true,
      patch: { business: { taxCode: '999' } },
    });
    expect(buildPatch(profile, {})).toEqual({ ok: true, patch: null });
  });

  it('checkPassword theo thứ tự prototype', () => {
    expect(checkPassword('', '', '')).toEqual({ ok: false, error: 'Nhập mật khẩu hiện tại' });
    expect(checkPassword('a', 'abc', 'abc')).toEqual({
      ok: false,
      error: 'Mật khẩu mới chưa đủ mạnh',
    });
    expect(checkPassword('a', 'Abcdefg1', 'x')).toEqual({
      ok: false,
      error: 'Xác nhận mật khẩu không khớp',
    });
    expect(checkPassword('a', 'Abcdefg1', 'Abcdefg1')).toEqual({ ok: true });
  });

  it('strengthBars tô màu theo điểm', () => {
    expect(strengthBars('').bars).toEqual(['off', 'off', 'off', 'off']);
    expect(strengthBars('a').bars).toEqual(['off', 'off', 'off', 'off']);
    expect(strengthBars('abcdefgh').bars).toEqual(['weak', 'off', 'off', 'off']);
    expect(strengthBars('Abcdefg1').bars).toEqual(['fair', 'fair', 'fair', 'off']);
    expect(strengthBars('Abcdef1!').score).toBe(4);
  });

  it('activityGroups: chỉ nhóm đã tham gia (D-71); giữ thứ tự gốc', () => {
    const g = (id: string, myStatus: GroupItem['myStatus']): GroupItem => ({
      id,
      name: `OPC ${id}`,
      province: 'x',
      region: 'Miền Bắc',
      memberCount: 10,
      weeklyActive: 1,
      description: '',
      myStatus,
      coverUrl: null,
      avatars: [],
    });
    const rows = activityGroups([g('a', 'left'), g('b', null), g('c', 'member')]);
    expect(rows.map((r) => [r.id, r.order])).toEqual([['c', 2]]);
    expect(monoOf('OPC Hà Nội')).toBe('HN');
  });

  it('activityEvents tách thứ/ngày, chỉ sự kiện đã đăng ký', () => {
    const e = { id: 'e2', day: 'T7, 25/10', time: '09:00', title: 'W', place: 'Zoom' };
    const rows = activityEvents([
      { ...e, registeredByMe: true } as EventItem,
      { ...e, id: 'e3', registeredByMe: false } as EventItem,
    ]);
    expect(rows).toEqual([
      { id: 'e2', dow: 'T7', dnum: '25', title: 'W', time: '09:00', place: 'Zoom' },
    ]);
  });

  it('vnDate theo giờ Việt Nam', () => {
    expect(vnDate('2026-03-01T17:00:00.000Z')).toBe('02/03/2026');
  });
});
