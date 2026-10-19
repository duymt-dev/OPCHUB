'use client';

import { Icon, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { rangeLabel } from '../data';
import { useOverview } from '../hooks/use-overview';
import { GrowthChart } from './growth-chart';
import styles from './overview.module.css';
import { StatCards } from './stat-cards';
import rangeCss from './date-range.module.css';

/** D-01 Tổng quan */
export function OverviewScreen() {
  const t = useTranslations('overview');
  const range = useOverview().data?.range;
  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('sub')}
        extra={
          <div className={rangeCss.box}>
            <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
            {range ? rangeLabel(range) : '—'}
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
