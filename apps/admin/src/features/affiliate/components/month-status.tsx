'use client';

import { StatusTag } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { CommissionStatus } from './commission-status';

/** A recorded monthly balance is unpaid, not a new commission awaiting approval. */
export function MonthStatus({ status }: { status: string }) {
  const t = useTranslations('affiliate.status');
  return status === 'recorded' ? (
    <StatusTag tone="amber">{t('unpaid')}</StatusTag>
  ) : (
    <CommissionStatus status={status} />
  );
}
