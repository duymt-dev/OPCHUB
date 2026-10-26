'use client';

import type { OnboardingKey } from '@opchub/shared/api-domains';
import { useRouter } from 'next/navigation';
import { openInPlace, openPricingPopup, PAYWALL_PATHS } from '@/features/membership';
import { useOnboardingFlag } from './use-onboarding';

/** Đích của CTA từng bước (prototype `_dash` → route app) */
const ROUTE: Partial<Record<OnboardingKey, string>> = {
  prof: '/profile',
  grp: '/community',
  chat: '/chat',
  st: '/stores/mine',
  pj: '/projects',
  nd: '/needs/mine',
  aff: '/affiliate',
  ev: '/events',
};

/** CTA của thẻ: thanh toán / bước khoá → hộp chuyển khoản; "Khám phá" đặt cờ rồi mở Gian hàng */
export function useStepActions() {
  const router = useRouter();
  const flag = useOnboardingFlag();
  const pay = () => void openInPlace(PAYWALL_PATHS.pay);
  return {
    pay,
    fundraising: openPricingPopup,
    go: (key: OnboardingKey) => {
      if (key === 'pay') return pay();
      if (key === 'ex') {
        void flag('explore');
        return router.push('/stores');
      }
      const to = ROUTE[key];
      if (to) router.push(to);
    },
  };
}
