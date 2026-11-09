'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { ErrorState } from '@opchub/ui';
import { useTranslations } from 'next-intl';

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('common.state');
  useEffect(() => {
    logger.error('app', error);
  }, [error]);
  return <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={reset} />;
}
