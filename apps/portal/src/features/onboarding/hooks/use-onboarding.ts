'use client';

import type { OnboardingFlag } from '@opchub/shared/api-domains';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { fetchOnboarding, onboardingKeys, postOnboardingFlag } from '../api';

/**
 * Tiến độ 8 bước của TK đang đăng nhập; `null` = NĐT (204, không có thẻ). Luôn tải lại khi mở
 * Dashboard vì bước đổi theo thao tác ở màn khác (nhóm, chat, gian hàng, sự kiện…).
 */
export function useOnboarding() {
  const uid = useAuthStore((s) => s.me?.id);
  return useQuery({
    queryKey: onboardingKeys.mine(),
    queryFn: fetchOnboarding,
    enabled: !!uid,
    refetchOnMount: 'always',
  });
}

/** Cờ đã gửi trong phiên tab này (theo TK) — mở lại màn không gọi lại API (cờ idempotent) */
const sent = new Set<string>();

/**
 * Đặt cờ "khám phá" / "chia sẻ link" (D-85) rồi làm mới thẻ. Lỗi mạng bỏ qua: cờ chỉ là tiện ích
 * của hướng dẫn, không chặn thao tác chính. NĐT không có onboarding → không gửi.
 */
export function useOnboardingFlag() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.me);
  return useCallback(
    async (key: OnboardingFlag): Promise<void> => {
      if (!me || me.accountType === 'investor') return;
      const id = `${me.id}:${key}`;
      if (sent.has(id)) return;
      sent.add(id);
      try {
        await postOnboardingFlag(key);
        await qc.invalidateQueries({ queryKey: onboardingKeys.all });
      } catch {
        sent.delete(id);
      }
    },
    [me, qc],
  );
}

/** Mở màn Gian hàng / Nhu cầu → cờ "khám phá" (prototype `componentDidUpdate`: pTab store | needs) */
export function useOnboardingVisit(key: OnboardingFlag): void {
  const flag = useOnboardingFlag();
  useEffect(() => {
    void flag(key);
  }, [flag, key]);
}
