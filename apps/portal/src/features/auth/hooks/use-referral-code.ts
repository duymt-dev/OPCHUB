'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { checkReferralCode, referralKeys } from '../referral-api';
import { initialReferral, normalizeReferral } from '../referral-model';

const subscribeCookie = () => () => undefined;
const cookieSnapshot = () => document.cookie;
const serverCookie = () => '';

/** URL > cookie for prefill; do not display/reuse a response for a stale code/email. */
export function useReferralCode(email: string, onEdit: () => void) {
  const t = useTranslations('auth.register');
  const params = useSearchParams();
  const cookie = useSyncExternalStore(subscribeCookie, cookieSnapshot, serverCookie);
  const [edited, setEdited] = useState<string | null>(null);
  const code = edited ?? initialReferral(params.get('ref'), cookie);
  const normalizedEmail = email.trim().toLowerCase();
  const [debounced, setDebounced] = useState({ code: '', email: '' });
  useEffect(() => {
    const timer = setTimeout(() => setDebounced({ code, email: normalizedEmail }), 400);
    return () => clearTimeout(timer);
  }, [code, normalizedEmail]);
  const query = useQuery({
    queryKey: referralKeys.check(debounced.code, debounced.email),
    queryFn: () => checkReferralCode(debounced.code, debounced.email),
    enabled: debounced.code.length >= 4,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const matches = code === debounced.code && normalizedEmail === debounced.email;
  const pending = code.length >= 4 && (!matches || query.isPending || query.isFetching);
  const error = !code
    ? undefined
    : code.length < 4
      ? t('referral.notFound')
      : pending
        ? undefined
        : query.isError
          ? t('referral.unavailable')
          : query.data?.valid === false
            ? query.data.message
            : undefined;
  const affiliateName =
    matches && !pending && query.data?.valid ? query.data.affiliateName : undefined;
  return {
    code,
    pending,
    error,
    affiliateName,
    setCode: (value: string) => {
      setEdited(normalizeReferral(value));
      onEdit();
    },
  };
}
