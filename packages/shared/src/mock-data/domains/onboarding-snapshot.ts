import type { AdminOnboarding } from '../../api-domains';
import { adminOnboardingOf, type OnboardingSnapshot } from '../../onboarding/steps';

/** Chỉ cho MSW/e2e — snapshot rỗng (TK mới, chưa đóng phí): 0/8, thiếu đủ 8 bước theo loại TK */
export const emptySnapshot = (accountType: 'business' | 'personal'): OnboardingSnapshot => ({
  accountType,
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
});

export const freshOnboarding = (accountType: 'business' | 'personal'): AdminOnboarding =>
  adminOnboardingOf(emptySnapshot(accountType), false);
