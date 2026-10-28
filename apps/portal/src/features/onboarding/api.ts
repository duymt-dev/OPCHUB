import {
  onboardingAutoRemindSchema,
  type OnboardingFlag,
  onboardingSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';

/** V4-611 Hướng dẫn bắt đầu (REQ-505): `GET /me/onboarding` (204 = NĐT), cờ khám phá / chia sẻ */

export const onboardingKeys = {
  all: ['onboarding'] as const,
  mine: () => [...onboardingKeys.all, 'mine'] as const,
};

export const fetchOnboarding = () => api('/me/onboarding', { schema: onboardingSchema.nullable() });

export const postOnboardingFlag = (key: OnboardingFlag) =>
  api(`/me/onboarding/flags/${encodeURIComponent(key)}`, { method: 'POST', schema: z.null() });

/** D-100 / D-115: tự nhắc khởi đầu khi mở Portal (server giới hạn 1 lần / ngày VN / người) */
export const postOnboardingAutoRemind = () =>
  api('/me/onboarding/auto-remind', { method: 'POST', schema: onboardingAutoRemindSchema });
