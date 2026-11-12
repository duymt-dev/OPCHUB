'use client';

import { authFooterFlags, languageOptions, LOCALE_COOKIE } from '@opchub/shared/fixtures';
import { AuthFrame as Frame, AuthPanel } from '@opchub/ui';
import type { AuthHeroCopy } from '@opchub/ui';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

const VALUES = ['learn', 'people', 'supply', 'globe'] as const;

/** Khung chung các màn Auth v4: ảnh nền, hero, thẻ form, chân trang (TIP-V4-617) */
export function AuthFrame({ children }: { children: ReactNode }) {
  const t = useTranslations('auth');
  const hero: AuthHeroCopy = {
    eyebrow: t('hero.eyebrow'),
    headlineLead: t('hero.headlineLead'),
    headlineAccent: t('hero.headlineAccent'),
    sub: t('hero.sub'),
    values: VALUES.map((icon) => ({
      icon,
      title: t(`hero.values.${icon}.title`),
      desc: t(`hero.values.${icon}.desc`),
    })),
  };
  return (
    <div data-admin-auth-font>
      <Frame
        copy={{
          hero,
          footer: {
            tagline: t('hero.tagline'),
            copyright: t('hero.copyright'),
            terms: t('hero.terms'),
            privacy: t('hero.privacy'),
          },
          support: t('support'),
          contact: t('contact'),
          langTitle: t('langTitle'),
        }}
        locale={useLocale()}
        languages={languageOptions}
        cookieName={LOCALE_COOKIE}
        flags={authFooterFlags}
      >
        <AuthPanel>{children}</AuthPanel>
      </Frame>
    </div>
  );
}
