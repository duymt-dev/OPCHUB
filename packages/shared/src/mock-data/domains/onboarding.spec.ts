import { beforeEach, describe, expect, it } from 'vitest';
import { adminMemberSchema, onboardingSchema } from '../../api-domains';
import {
  adminOnboardingFor,
  feeAction,
  getMockOnboardingMail,
  listAdminMembers,
  listMailLog,
  mockDb,
  myMockOnboarding,
  remindMockOnboarding,
  resetMockDb,
  saveMockOnboardingMail,
  updateProfile,
  setMockOnboardingFlag,
  syncOnboardingFlags,
  onboardingFlagCookie,
} from './index';

const NOW = Date.UTC(2026, 9, 16, 2, 0);

/** V4-611 MSW: tiến độ tính từ kho mock như server (D-85), Nhắc (D-88) */
describe('mock Hướng dẫn bắt đầu (V4-611)', () => {
  beforeEach(() => resetMockDb());

  it('M1 (DN, đã phí): 6/8 như prototype — thiếu Hồ sơ (chưa có ảnh) + Affiliate', () => {
    const o = onboardingSchema.parse(myMockOnboarding('m1'));
    expect(o).toMatchObject({ accountType: 'business', paid: true, done: 6, fundraising: null });
    expect(o.steps.filter((s) => !s.done).map((s) => s.key)).toEqual(['prof', 'aff']);
    expect(o.steps.every((s) => !s.locked)).toBe(true);
  });

  it('cờ chia sẻ link idempotent → 7/8; cookie cầu giữ cờ qua tải lại', () => {
    setMockOnboardingFlag('m1', 'affiliate_share');
    setMockOnboardingFlag('m1', 'affiliate_share');
    expect(myMockOnboarding('m1')?.done).toBe(7);
    const cookie = onboardingFlagCookie().split(';')[0]?.split('=')[1];
    resetMockDb();
    syncOnboardingFlags(cookie);
    expect(myMockOnboarding('m1')?.done).toBe(7);
  });

  it('TK chưa đóng phí (m6): bước 2–8 khoá, 0/8', () => {
    const o = myMockOnboarding('m6');
    expect(o).toMatchObject({ paid: false, done: 0 });
    expect(o?.steps.slice(1).every((s) => s.locked && !s.done)).toBe(true);
  });

  it('Cá nhân có dự án → thẻ tuỳ chọn Gọi vốn; không phải thành viên → null (204)', () => {
    feeAction('m2', 'renew', NOW);
    const o = myMockOnboarding('m2');
    expect(o?.accountType).toBe('personal');
    // p2 của Lê Minh Anh đang gọi vốn (khoản legacy như migration) → thẻ tuỳ chọn đã xong
    expect(o?.fundraising).toEqual({ done: true });
    expect(o?.steps.map((s) => s.key)).toEqual([
      'pay',
      'prof',
      'grp',
      'chat',
      'pj',
      'ex',
      'aff',
      'ev',
    ]);
    expect(myMockOnboarding('inv-nam')).toBeNull();
  });

  it('Admin: cột x/8 trên mọi dòng + lọc Đã / Chưa hoàn tất', () => {
    const all = listAdminMembers();
    all.items.forEach((m) => adminMemberSchema.parse(m));
    expect(all.items.find((m) => m.id === 'm1')?.onboarding).toEqual({
      done: 6,
      missing: ['prof', 'aff'],
      reminded: false,
    });
    expect(listAdminMembers({ onboarding: 'done' }).items).toHaveLength(0);
    expect(listAdminMembers({ onboarding: 'todo' }).items).toHaveLength(10);
  });

  it('Nhắc: thông báo system + thư onboarding + "Đã nhắc"; lần 2 trong 24 giờ → 429', () => {
    expect(remindMockOnboarding('admin', 'm1', NOW)).toEqual({ ok: true, data: null });
    expect(adminOnboardingFor('m1', NOW + 1000)?.reminded).toBe(true);
    const n = mockDb()
      .notifications.get('m1')
      ?.find((x) => x.type === 'system');
    expect(n).toMatchObject({
      type: 'system',
      link: '/dashboard',
      body: 'Còn thiếu: Hồ sơ, Affiliate',
    });
    expect(listMailLog()[0]).toMatchObject({ kind: 'onboarding', to: 'an.nguyen@mediasoft.vn' });
    expect(remindMockOnboarding('admin', 'm1', NOW + 3600_000)).toMatchObject({ status: 429 });
    expect(remindMockOnboarding('admin', 'm1', NOW + 25 * 3600_000).ok).toBe(true);
  });

  it('đủ 8 bước (ảnh đại diện + chia sẻ link) → lọc Đã hoàn tất; Nhắc → 409; không có → 404', () => {
    updateProfile('m1', { avatarUrl: 'https://cdn.opchub.community/a/m1.png' });
    setMockOnboardingFlag('m1', 'affiliate_share');
    expect(myMockOnboarding('m1')?.done).toBe(8);
    expect(listAdminMembers({ onboarding: 'done' }).items.map((m) => m.id)).toEqual(['m1']);
    expect(remindMockOnboarding('admin', 'm1', NOW)).toMatchObject({ status: 409 });
    expect(remindMockOnboarding('admin', 'zz', NOW)).toMatchObject({ status: 404 });
  });

  it('mẫu email nhắc: mặc định, lưu được', () => {
    expect(getMockOnboardingMail().subject).toBe('Hoàn tất hướng dẫn bắt đầu trên OPC Hub');
    saveMockOnboardingMail('admin', { subject: 'S', body: 'B {{ten}}' });
    expect(getMockOnboardingMail()).toEqual({ subject: 'S', body: 'B {{ten}}' });
  });
});
