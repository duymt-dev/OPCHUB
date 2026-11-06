'use client';

import { DateRangePicker, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import styles from './stores-header.module.css';

/** The prototype keeps the compact date control beside the Stores title on mobile. */
export function StoresHeader() {
  const t = useTranslations('stores');
  return (
    <div data-store-header className={styles.header}>
      <PageHeader title={t('title')} extra={<DateRangePicker className={styles.range ?? ''} />} />
    </div>
  );
}
