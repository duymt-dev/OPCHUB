'use client';

import { DateRangePicker, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import styles from './stores-header.module.css';
import { useAdminUiLabels } from '@/i18n/ui-labels';

/** The prototype keeps the compact date control beside the Stores title on mobile. */
export function StoresHeader() {
  const ui = useAdminUiLabels();
  const t = useTranslations('stores');
  return (
    <div data-store-header className={styles.header}>
      <PageHeader
        title={t('title')}
        extra={<DateRangePicker {...ui.dateRange} className={styles.range ?? ''} />}
      />
    </div>
  );
}
