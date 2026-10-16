'use client';

import { languageOptions, LOCALE_COOKIE } from '@opchub/shared/fixtures';
import { AuthLayout, AuthPanel, LanguageSwitch } from '@opchub/ui';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LoginHero } from './login-hero';

/** Khung chung các màn Auth: hero trái, hỗ trợ + ngôn ngữ, cột form 440px */
export function AuthFrame({ children }: { children: ReactNode }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  return (
    <AuthLayout
      hero={<LoginHero />}
      supportText={t('support')}
      supportLink={t('contact')}
      supportHref="#"
      language={
        <LanguageSwitch
          title={t('langTitle')}
          current={locale}
          options={languageOptions}
          cookieName={LOCALE_COOKIE}
        />
      }
    >
      <AuthPanel>{children}</AuthPanel>
    </AuthLayout>
  );
}
