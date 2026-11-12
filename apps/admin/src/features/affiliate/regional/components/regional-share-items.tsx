'use client';
import { Button } from 'antd';
import { formatNumber } from '@/i18n/format';
import { useLocale, useTranslations } from 'next-intl';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import type { RegionalRegion } from '@opchub/shared/api-domains';
import { useRegionalShareItems } from '../hooks/use-regional-shares';
import { affiliateDate, affiliateMoney } from '../../format';
import styles from './regional-share.module.css';
export function RegionalShareItems({ region }: { region: RegionalRegion }) {
  const locale = useLocale();
  const t = useTranslations('affiliate.regional.share');
  const q = useRegionalShareItems(region);
  if (q.isError)
    return (
      <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={() => void q.refetch()} />
    );
  if (!q.data) return <PageSkeleton />;
  const more = q.data.pages.at(-1)?.more ?? 0;
  return (
    <section>
      <b>{t('items')}</b>
      <div role="table" aria-label={t('items')}>
        <div className={styles.itemHead} role="row">
          {(
            [
              'date',
              'customer',
              'affiliates',
              'base',
              'percent',
              'directorAmount',
              'status',
            ] as const
          ).map((k) => (
            <span role="columnheader" key={k}>
              {t(k)}
            </span>
          ))}
        </div>
        {q.data.pages
          .flatMap((p) => p.items)
          .map((item) => (
            <div key={item.id} role="row" className={styles.item}>
              {[
                affiliateDate(item.recordedAt, locale),
                item.customerName,
                item.affiliateName,
                affiliateMoney(item.baseAmount, locale),
                t('percentYear', {
                  percent: formatNumber(item.percent, locale),
                  year: formatNumber(item.customerYear, locale),
                }),
                affiliateMoney(item.directorAmount, locale),
                t(item.status === 'paid' ? 'paidStatus' : 'pendingStatus'),
              ].map((text, i) => (
                <span role="cell" key={i}>
                  {text}
                </span>
              ))}
            </div>
          ))}
      </div>
      {more > 0 && (
        <Button type="link" loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
          {t('more', { n: formatNumber(more, locale) })}
        </Button>
      )}
    </section>
  );
}
