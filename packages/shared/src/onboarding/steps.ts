import {
  type AdminOnboarding,
  ONBOARDING_KEYS_BIZ,
  ONBOARDING_KEYS_PER,
  type Onboarding,
  type OnboardingKey,
  type OnboardingStep,
} from '../api-domains/onboarding';

/**
 * Ảnh chụp dữ liệu nguồn của một thành viên (D-85) — server lấy bằng MỘT truy vấn cho cả lô,
 * MSW dựng từ kho mock. Hàm dưới thuần, dùng chung hai nơi.
 */
export interface OnboardingSnapshot {
  accountType: 'business' | 'personal';
  paid: boolean;
  profile: boolean;
  group: boolean;
  chat: boolean;
  /** DN: gian hàng không bị ẩn và có giới thiệu hoặc ≥ 1 sản phẩm / dịch vụ */
  store: boolean;
  project: boolean;
  need: boolean;
  explore: boolean;
  affiliateShare: boolean;
  event: boolean;
  /** Cá nhân: có dự án đã mua Gói Gọi vốn (chờ thẩm định / đang gọi vốn) */
  fundraising: boolean;
}

const raw = (s: OnboardingSnapshot): Record<OnboardingKey, boolean> => ({
  pay: s.paid,
  prof: s.profile,
  grp: s.group,
  chat: s.chat,
  st: s.store,
  pj: s.project,
  nd: s.need,
  ex: s.explore,
  aff: s.affiliateShare,
  ev: s.event,
});

/** 8 bước theo loại TK; bước 2–8 chỉ xong khi đã đóng phí, chưa phí thì khoá (prototype `_ob`) */
export function onboardingSteps(s: OnboardingSnapshot): OnboardingStep[] {
  const keys = s.accountType === 'business' ? ONBOARDING_KEYS_BIZ : ONBOARDING_KEYS_PER;
  const ok = raw(s);
  return keys.map((key) => ({
    key,
    done: key === 'pay' ? s.paid : s.paid && ok[key],
    locked: key !== 'pay' && !s.paid,
  }));
}

export function onboardingOf(s: OnboardingSnapshot): Onboarding {
  const steps = onboardingSteps(s);
  return {
    accountType: s.accountType,
    paid: s.paid,
    done: steps.filter((x) => x.done).length,
    total: 8,
    steps,
    fundraising: s.accountType === 'personal' && s.project ? { done: s.fundraising } : null,
  };
}

export function adminOnboardingOf(s: OnboardingSnapshot, reminded: boolean): AdminOnboarding {
  const steps = onboardingSteps(s);
  return {
    done: steps.filter((x) => x.done).length,
    missing: steps.filter((x) => !x.done).map((x) => x.key),
    reminded,
  };
}
