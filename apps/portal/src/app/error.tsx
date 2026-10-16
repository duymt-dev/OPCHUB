'use client';

import { ErrorState } from '@opchub/ui';
import { useTranslations } from 'next-intl';

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('common.state');
  return <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={reset} />;
}
