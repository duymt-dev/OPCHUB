'use client';

import { Icon, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { GrowthChart } from './growth-chart';
import styles from './overview.module.css';
import { StatCards } from './stat-cards';
import range from './date-range.module.css';

/** D-01 Tổng quan */
export function OverviewScreen() {
  const t = useTranslations('overview');
  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('sub')}
        extra={
          <div className={range.box}>
            <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
            {t('dateRange')}
            <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
          </div>
        }
      />
      <div className={styles.wrap}>
        <StatCards />
        <GrowthChart />
      </div>
    </>
  );
}
