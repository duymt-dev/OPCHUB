'use client';

import { EmptyState } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { ssoCallback } from '../api';
import { SsoNewMember } from './sso-new-member';

/** D-45: callback SSO — email đã có TK thì vào luôn; mới thì bổ sung loại TK, nhóm, SĐT (bỏ OTP) */
export function SsoCompleteScreen() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useSearchParams();
  // BUG-034: provider nằm trong path (`/sso/callback/google`); `?provider=` giữ cho MSW / link cũ
  const fromPath = useParams<{ provider?: string }>().provider;
  const provider = fromPath ?? params.get('provider') ?? '';
  const code = params.get('code') ?? '';
  const state = params.get('state') ?? '';
  // D-64: người dùng huỷ ở Google (`?error=access_denied`) hoặc thiếu tham số → không gọi API
  const usable = Boolean(provider && code && state && !params.get('error'));
  const setSession = useAuthStore((s) => s.setSession);
  const q = useQuery({
    queryKey: ['sso-callback', provider, code, state],
    queryFn: () => ssoCallback(provider, code, state),
    enabled: usable,
    retry: false,
  });

  useEffect(() => {
    if (q.data?.status !== 'existing') return;
    setSession(q.data.accessToken, q.data.me);
    router.replace('/community');
  }, [q.data, router, setSession]);

  if (!usable || q.isError) {
    return (
      <EmptyState title={t('sso.failed')} action={<Link href="/login">{t('sso.back')}</Link>} />
    );
  }
  if (q.data?.status !== 'new') return <EmptyState title={t('sso.loading')} />;
  return <SsoNewMember data={q.data} />;
}
