'use client';

import { Icon, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import styles from './affiliate.module.css';

/** Prototype's shared visual date range; history's effective month filter is below. */
export function AffiliateHeader() {
  const t = useTranslations('affiliate');
  return (
    <PageHeader
      title={t('title')}
      extra={
        <div className={styles.dateRange}>
          <Icon name="calendar" />
          <span>{t('dateRange')}</span>
          <Icon name="chevronDown" size={14} />
        </div>
      }
    />
  );
}
