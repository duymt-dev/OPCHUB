import {
  type AdminOnboarding,
  ONBOARDING_SHORT,
  type OnboardingKey,
} from '@opchub/shared/api-domains';

/** Màu thanh 4px cột "Khởi đầu" (prototype `obCol`): đủ 8 xanh lá, ≥ 4 xanh dương, còn lại vàng */
export function onboardingColor(o: AdminOnboarding, total = 8): string {
  if (o.done >= total) return '#52C41A';
  return o.done >= 4 ? '#1677FF' : '#FAAD14';
}

export const onboardingPct = (o: AdminOnboarding, total = 8) =>
  `${Math.round((o.done / total) * 100)}%`;

/** Nhãn ngắn các bước còn thiếu (ONBOARDING_SHORT, cùng bộ với thông báo / email nhắc) */
export const missingLabels = (keys: readonly OnboardingKey[]) =>
  keys.map((k) => ONBOARDING_SHORT[k]).join(', ');
