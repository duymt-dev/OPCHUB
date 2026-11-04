'use client';
import { useTranslations } from 'next-intl';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import type { RegionalRegion } from '@opchub/shared/api-domains';
import { useRegionalPayoutHistory } from '../hooks/use-regional-shares';
import { affiliateDate, affiliateMoney } from '../../format';
import styles from './regional-share.module.css';
export function RegionalPayoutHistory({ region }: { region: RegionalRegion }) {
  const t = useTranslations('affiliate.regional.share');
  const q = useRegionalPayoutHistory(region);
  if (q.isError)
    return (
      <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={() => void q.refetch()} />
    );
  if (!q.data) return <PageSkeleton />;
  return (
    <section>
      <b>{t('history')}</b>
      {q.data.items.map((p) => (
        <div key={p.id} className={styles.history}>
          <span>
            {p.monthKeys
              .map((month) => {
                const [y, m] = month.split('-');
                return t('month', { month: m ?? '', year: y ?? '' });
              })
              .join(', ')}{' '}
            · {affiliateDate(p.paidAt)} · {p.directorName}
          </span>
          <b>{affiliateMoney(p.amount)}</b>
        </div>
      ))}
    </section>
  );
}
