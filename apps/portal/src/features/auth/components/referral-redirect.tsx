'use client';

import { EmptyState } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { checkReferralCode, trackReferralClick } from '../referral-api';
import { referralCookie, validReferralLink } from '../referral-model';

export function ReferralRedirect({ rawCode }: { rawCode: string }) {
  const router = useRouter();
  const t = useTranslations('auth.register.referral');
  useEffect(() => {
    const code = rawCode.trim().toUpperCase();
    if (!validReferralLink(code)) {
      router.replace('/register');
      return;
    }
    let disposed = false;
    void (async () => {
      // StrictMode/reload may repeat HTTP; the backend deduplicates IP+code for one hour.
      const [lookup] = await Promise.allSettled([
        checkReferralCode(code),
        trackReferralClick(code),
      ]);
      if (disposed) return;
      if (lookup?.status === 'fulfilled' && lookup.value.valid) {
        document.cookie = referralCookie(
          code,
          lookup.value.cookieDays,
          location.protocol === 'https:',
        );
      }
      router.replace(`/register?ref=${code}`);
    })();
    return () => {
      disposed = true;
    };
  }, [rawCode, router]);
  return <EmptyState title={t('redirecting')} />;
}
