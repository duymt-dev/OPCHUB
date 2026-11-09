'use client';

import dayjs from 'dayjs';
import { DateRangePicker, PageHeader, type DateRangeValue } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useOverview } from '../hooks/use-overview';
import { useOverviewUrl } from '../hooks/use-overview-url';
import { GrowthChart } from './growth-chart';
import { ConversionTable } from './conversion-table';
import styles from './overview.module.css';
import { StatCards } from './stat-cards';
import { SystemFlow } from './system-flow';

/** D-01 Tổng quan v4: Luồng hệ thống + 4 thẻ số + tăng trưởng (D-89) */
export function OverviewScreen() {
  const t = useTranslations('overview');
  const { data } = useOverview();
  const { params, update } = useOverviewUrl();

  const range = data?.range;
  const pickerValue: DateRangeValue | null =
    params.from && params.to
      ? [dayjs(params.from), dayjs(params.to)]
      : range
        ? [dayjs(range.from), dayjs(range.to)]
        : null;

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('sub')}
        extra={
          <DateRangePicker
            value={pickerValue}
            onChange={(dates) => {
              if (dates?.[0] && dates?.[1]) {
                update({
                  from: dates[0].format('YYYY-MM-DD'),
                  to: dates[1].format('YYYY-MM-DD'),
                });
              } else {
                update({ from: '', to: '' });
              }
            }}
          />
        }
      />
      <div className={styles.wrap}>
        <SystemFlow />
        <StatCards />
        <GrowthChart />
        <ConversionTable />
      </div>
    </>
  );
}
