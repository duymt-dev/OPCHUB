'use client';

import { Icon, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import styles from './affiliate.module.css';

/** Prototype v4 page head "Mạng lưới Affiliate" + khoảng ngày hiển thị (như Portal); lọc tháng thật ở dưới */
export function AffiliatePageHeader() {
  const t = useTranslations('affiliate');
  return (
    <div className={styles.pageHeader}>
      <PageHeader
        title={t('pageTitle')}
        subtitle=" "
        extra={
          <div className={styles.dateRange}>
            <Icon name="calendar" />
            <span>{t('dateRange')}</span>
            <Icon name="chevronDown" size={14} />
          </div>
        }
      />
    </div>
  );
}
