'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { postOnboardingAutoRemind } from '../api';

/** Đã gọi trong tab này (theo TK) — điều hướng giữa các màn không gọi lại */
const asked = new Set<string>();

/**
 * D-100 / D-115 (prototype v4.2 `_obAutoRemind`): mở Portal (đã có phiên) → server tự nhắc nếu còn thiếu bước
 * và chưa nhắc trong ngày VN. Fire-and-forget: lỗi không chặn Portal; có nhắc mới → làm mới chuông thông báo.
 * NĐT không có onboarding → không gọi.
 */
export function useOnboardingAutoRemind(notificationsKey: readonly unknown[]) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.me);
  const id = me && me.accountType !== 'investor' ? me.id : null;
  useEffect(() => {
    if (!id || asked.has(id)) return;
    asked.add(id);
    postOnboardingAutoRemind()
      .then((r) => {
        if (r.reminded) void qc.invalidateQueries({ queryKey: notificationsKey });
      })
      .catch(() => undefined);
  }, [id, qc, notificationsKey]);
}
