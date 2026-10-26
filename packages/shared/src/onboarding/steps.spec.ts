import { describe, expect, it } from 'vitest';
import { adminOnboardingOf, type OnboardingSnapshot, onboardingOf } from './steps';

const NONE: OnboardingSnapshot = {
  accountType: 'business',
  paid: false,
  profile: false,
  group: false,
  chat: false,
  store: false,
  project: false,
  need: false,
  explore: false,
  affiliateShare: false,
  event: false,
  fundraising: false,
};
const ALL = Object.fromEntries(
  Object.entries(NONE).map(([k, v]) => [k, typeof v === 'boolean' ? true : v]),
) as OnboardingSnapshot;

/** V4-611 D-85: 8 bước tính từ dữ liệu thật; bước 2–8 khoá khi chưa đóng phí */
describe('onboarding steps (D-85)', () => {
  it('DN: thứ tự prototype; đủ dữ liệu + đã phí → 8/8; Cá nhân dùng dự án / khám phá', () => {
    const biz = onboardingOf(ALL);
    expect(biz.steps.map((s) => s.key)).toEqual([
      'pay',
      'prof',
      'grp',
      'chat',
      'st',
      'nd',
      'aff',
      'ev',
    ]);
    expect(biz.done).toBe(8);
    const per = onboardingOf({ ...ALL, accountType: 'personal', store: false, need: false });
    expect(per.steps.map((s) => s.key)).toEqual([
      'pay',
      'prof',
      'grp',
      'chat',
      'pj',
      'ex',
      'aff',
      'ev',
    ]);
    expect(per.done).toBe(8);
    expect(onboardingOf({ ...ALL, accountType: 'personal', project: false }).done).toBe(7);
  });

  it('chưa đóng phí: bước 2–8 khoá và không tính xong dù có dữ liệu', () => {
    const o = onboardingOf({ ...ALL, paid: false });
    expect(o.done).toBe(0);
    expect(o.steps.filter((s) => s.locked).map((s) => s.key)).toHaveLength(7);
    expect(o.steps[0]).toEqual({ key: 'pay', done: false, locked: false });
  });

  it('thẻ Gọi vốn tuỳ chọn: chỉ Cá nhân có dự án, không tính vào x/8', () => {
    expect(onboardingOf(ALL).fundraising).toBeNull();
    const per = { ...NONE, accountType: 'personal' as const, paid: true, project: true };
    expect(onboardingOf(per).fundraising).toEqual({ done: false });
    expect(onboardingOf({ ...per, fundraising: true })).toMatchObject({
      done: 2,
      fundraising: { done: true },
    });
    expect(onboardingOf({ ...per, project: false }).fundraising).toBeNull();
  });

  it('Admin: x/8 + danh sách bước còn thiếu theo thứ tự', () => {
    const a = adminOnboardingOf({ ...NONE, paid: true, group: true, event: true }, true);
    expect(a).toEqual({ done: 3, missing: ['prof', 'chat', 'st', 'nd', 'aff'], reminded: true });
  });
});
