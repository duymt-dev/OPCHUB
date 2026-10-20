'use client';

import { ssoProviders } from '@opchub/shared/fixtures';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { env } from '@/lib/env';
import { messageOf } from '@/lib/api-errors';
import { prepareSsoReferral } from '../referral-session';

/** Nhà cung cấp AI đăng nhập qua tài khoản Google (giống prototype) */
const VIA_GOOGLE = new Set(['chatgpt', 'gemini', 'deepseek']);
const REDIRECT_DELAY_MS = 900;

/**
 * Bấm nút SSO: báo đang chuyển hướng rồi sang provider. Provider quay về
 * `/sso/callback/<provider>?code=` (D-45, BUG-034). Khi dùng MSW thì vào thẳng callback giả.
 */
export function useSso(referralCode?: string) {
  const t = useTranslations('auth.login');
  const tc = useTranslations('common.errors');
  const toast = useToast();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      active.current?.abort();
    },
    [],
  );

  return (id: string) => {
    const name = ssoProviders.find((s) => s.id === id)?.name ?? id;
    toast(VIA_GOOGLE.has(id) ? t('ssoViaGoogle', { name }) : t('ssoRedirect', { name }));
    clearTimeout(timer.current);
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    timer.current = setTimeout(() => {
      void (async () => {
        try {
          if (referralCode !== undefined) await prepareSsoReferral(referralCode, controller.signal);
          if (controller.signal.aborted) return;
          if (env.NEXT_PUBLIC_API_MOCKING === 'msw') {
            router.push(`/sso/callback/${id}?code=mock`);
          } else {
            // Provider OAuth nằm ngoài app Next — điều hướng toàn trang là đúng
            const url = new URL(
              `${env.NEXT_PUBLIC_API_URL}/auth/sso/${id}`,
              window.location.origin,
            );
            window.location.assign(url.toString());
          }
        } catch (error) {
          if (!controller.signal.aborted) toast(messageOf(error, tc('failed')));
        }
      })();
    }, REDIRECT_DELAY_MS);
  };
}
