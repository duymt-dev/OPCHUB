'use client';

import { Suspense, use, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { prepareAdminIntl } from '@/i18n/intl/runtime';
import { AdminIntlResourceBoundary } from './admin-intl-resource-boundary';

function PreparedLocale({ children }: { children: ReactNode }) {
  const ready = prepareAdminIntl(useLocale());
  if (ready) use(ready);
  return children;
}

/** Stable boundary inside QueryClient; locale switches never key/remount the form subtree. */
export function AdminIntlReady({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const t = useTranslations('common.state');
  return (
    <AdminIntlResourceBoundary locale={locale} title={t('error')} retryLabel={t('retry')}>
      <Suspense fallback={<div role="status">{t('loading')}</div>}>
        <PreparedLocale>{children}</PreparedLocale>
      </Suspense>
    </AdminIntlResourceBoundary>
  );
}
