'use client';

import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useRetainedRevenue } from '../hooks/use-retained-revenue';
import { revenueMoney } from '../revenue-presentation';
import styles from './affiliate.module.css';
import tabs from './affiliate-tabs.module.css';

export function AffiliateRetainedTotal() {
  const t = useTranslations('revenue');
  const state = useTranslations('common.state');
  const query = useRetainedRevenue();
  return (
    <span
      className={tabs.summary}
      role="status"
      aria-label={t('retained')}
      aria-busy={query.isFetching}
    >
      {t('retained')}{' '}
      {query.isError ? (
        <>
          {state('error')}
          <Button type="link" size="small" onClick={() => void query.refetch()}>
            {state('retry')}
          </Button>
        </>
      ) : (
        <b className={styles.net}>
          {query.data ? revenueMoney(query.data.affiliateAttributed) : '—'}
        </b>
      )}
    </span>
  );
}
