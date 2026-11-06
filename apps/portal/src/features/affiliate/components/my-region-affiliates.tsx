'use client';
import { AdminTable, EmptyState } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { formatVnd } from '@/features/membership';
import type { DirectorRegion } from '../types';
import styles from './my-region.module.css';

export function MyRegionAffiliates({ data }: { data: DirectorRegion }) {
  const t = useTranslations('affiliate.region');
  return (
    <section>
      <h3>{t('affiliatesTitle')}</h3>
      <div className={styles.table}>
        <AdminTable
          rowKey="id"
          data={data.affiliates}
          pagination={false}
          empty={<EmptyState title={t('empty')} />}
          columns={[
            {
              title: t('affiliate'),
              key: 'name',
              render: (_, r) => (
                <div>
                  <b>{r.name}</b>
                  <small>{r.code}</small>
                </div>
              ),
            },
            { title: t('customers'), dataIndex: 'customers', width: 102 },
            {
              title: t('broughtRevenue'),
              key: 'revenue',
              width: 152,
              render: (_, r) => formatVnd(r.revenue),
            },
            {
              title: t('regionShare'),
              key: 'share',
              width: 162,
              render: (_, r) => <b className={styles.money}>{formatVnd(r.share)}</b>,
            },
          ]}
        />
      </div>
      {data.more > 0 ? <p className={styles.more}>{t('more', { count: data.more })}</p> : null}
    </section>
  );
}
