'use client';
import { AdminTable } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { formatVnd } from '@/features/membership';
import type { DirectorRegion } from '../types';
import styles from './my-region.module.css';

export function MyRegionYears({ rows }: { rows: DirectorRegion['years'] }) {
  const t = useTranslations('affiliate.region');
  return (
    <section>
      <h3>{t('yearsTitle')}</h3>
      <div className={styles.table}>
        <AdminTable
          rowKey="year"
          data={rows}
          pagination={false}
          columns={[
            {
              title: t('customerYear'),
              key: 'year',
              render: (_, r) =>
                t(r.year === 4 ? 'fromFourth' : r.year === 1 ? 'firstYear' : 'renewalYear', {
                  year: r.year,
                }),
            },
            {
              title: t('percent'),
              key: 'percent',
              align: 'right',
              width: 102,
              render: (_, r) => `${r.percent}%`,
            },
            { title: t('count'), dataIndex: 'count', align: 'right', width: 102 },
            {
              title: t('revenueShort'),
              key: 'revenue',
              align: 'right',
              width: 142,
              render: (_, r) => formatVnd(r.revenue),
            },
            {
              title: t('shareShort'),
              key: 'share',
              align: 'right',
              width: 152,
              render: (_, r) => <b className={styles.money}>{formatVnd(r.share)}</b>,
            },
          ]}
        />
      </div>
    </section>
  );
}
