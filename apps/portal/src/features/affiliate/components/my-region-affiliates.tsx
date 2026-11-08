'use client';
import { Button } from 'antd';
import { useMyRegionAffiliates } from '../hooks/use-my-region-affiliates';
import { AdminTable, EmptyState } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { formatVnd } from '@/features/membership';
import type { DirectorRegion } from '../types';
import styles from './my-region.module.css';

export function MyRegionAffiliates({ data }: { data: DirectorRegion }) {
  const t = useTranslations('affiliate.region');
  const state = useMyRegionAffiliates(data);
  return (
    <section>
      <div className={styles.actions}>
        <h3>{t('affiliatesTitle')}</h3>
        <Button onClick={() => void state.download()} loading={state.downloading}>
          {t('downloadCsv')}
        </Button>
      </div>
      <div className={styles.table}>
        <AdminTable
          rowKey="id"
          data={state.items}
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
            { title: t('customers'), dataIndex: 'customers', align: 'right', width: 102 },
            {
              title: t('broughtRevenue'),
              key: 'revenue',
              align: 'right',
              width: 152,
              render: (_, r) => formatVnd(r.revenue),
            },
            {
              title: t('regionShare'),
              key: 'share',
              align: 'right',
              width: 162,
              render: (_, r) => <b className={styles.money}>{formatVnd(r.share)}</b>,
            },
          ]}
        />
      </div>
      {state.more > 0 ? (
        <Button
          className={styles.more ?? ''}
          loading={state.query.isFetchingNextPage}
          onClick={() => void state.query.fetchNextPage()}
        >
          {t('loadMore', { count: state.more })}
        </Button>
      ) : null}
      {state.query.isFetchNextPageError || state.downloadError ? (
        <p role="alert">{t('loadError')}</p>
      ) : null}
    </section>
  );
}
