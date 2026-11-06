import { beforeEach, describe, expect, it } from 'vitest';
import { adminMemberSchema } from '../../api-domains';
import { planAmountOf } from '../../membership/pricing';
import {
  decideBizVerification,
  feeSummary,
  listAdminMembers,
  listFees,
  resetMockDb,
  setUsersStatus,
} from './index';
import { readMockPrices } from './price-config';
import { mockDb } from './store';

describe('mock Thành viên (admin)', () => {
  beforeEach(() => resetMockDb());

  it('liệt kê theo seed, đếm theo loại, đúng schema', () => {
    const r = listAdminMembers();
    expect(r.items).toHaveLength(10);
    expect(r.counts).toEqual({ all: 10, business: 6, personal: 4 });
    r.items.forEach((m) => adminMemberSchema.parse(m));
    expect(r.items.find((m) => m.id === 'm4')).toMatchObject({ status: 'locked' });
  });

  it('D-90 MSW sắp xếp khớp server: mã TV tăng dần như prototype v4 (m1 → m8)', () => {
    const ids = listAdminMembers().items.map((m) => m.id);
    expect(ids).toEqual(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10']);
  });

  it('lọc loại + tìm theo tên/email/công ty', () => {
    expect(listAdminMembers({ type: 'business' }).items).toHaveLength(6);
    expect(listAdminMembers({ q: 'solobooks' }).items.map((m) => m.id)).toEqual(['m3']);
    expect(listAdminMembers({ q: 'zzzz' }).items).toHaveLength(0);
  });

  it('thanh lọc v4 (D-89): vai trò, phí, trạng thái, hồ sơ, ngày đăng ký, nhóm', () => {
    const ids = (f: Parameters<typeof listAdminMembers>[0]) =>
      listAdminMembers(f)
        .items.map((m) => m.id)
        .sort();
    expect(ids({ role: 'business' })).toEqual(['m1', 'm10', 'm3', 'm5', 'm7', 'm9']);
    expect(ids({ role: 'expert' })).toEqual(['m2']);
    // FEE_SEED m2, m3, m4, m5, m7, m8 + TK demo m1, đóng từ ngày tham gia: m4 (01/09/2025) đã hết
    // hạn, m3 (20/10/2025) còn hiệu lực đến 20/10/2026 (sắp hết hạn = vẫn đã đóng)
    expect(ids({ fee: 'unpaid' })).toEqual(['m4', 'm6']);
    expect(ids({ status: 'locked' })).toEqual(['m4']);
    expect(ids({ profile: 'inc' })).toEqual([]);
    expect(ids({ days: 7 })).toEqual(['m5', 'm7']);
    expect(ids({ group: 'c6' })).toEqual(['m1', 'm6', 'm8']);
  });

  it('D-107 lọc phí 3 lựa chọn: trial không thuộc Đã đóng phí / Chưa đóng (như server)', () => {
    const ids = (fee: 'paid' | 'trial' | 'unpaid') =>
      listAdminMembers({ fee })
        .items.map((m) => m.id)
        .sort();
    expect(ids('trial')).toEqual([]);
    const f = mockDb().fees.find((x) => x.userId === 'm6');
    if (!f) throw new Error('thiếu phí m6');
    f.status = 'trial';
    expect(ids('trial')).toEqual(['m6']);
    expect(ids('unpaid')).toEqual(['m4']);
    expect(ids('paid')).not.toContain('m6');
  });

  it('D-101 thẻ doanh thu = Σ giá năm hiện hành theo gói của active + expiring; cột nhóm', () => {
    const prices = readMockPrices();
    const fees = mockDb().fees.filter((f) => f.status === 'active' || f.status === 'expiring');
    const want = fees.reduce(
      (a, f) => a + planAmountOf(prices, f.accountType === 'business' ? 'business' : 'personal'),
      0,
    );
    expect(feeSummary().revenue).toBe(want);
    const m1 = listFees(undefined, 'TV000001')[0];
    expect(m1?.groups.length).toBeGreaterThan(0);
  });

  it('RB-R01 không còn vai trò quản trị trên thành viên; khoá hàng loạt idempotent', () => {
    expect(listAdminMembers().items.some((m) => 'systemRole' in m)).toBe(false);
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
