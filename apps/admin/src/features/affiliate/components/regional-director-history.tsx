'use client';

import { ErrorState, PageSkeleton } from '@opchub/ui';
import { Button } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import type { useRegionalDirectors } from '../hooks/use-regional-directors';
import styles from './regional-director.module.css';

export function RegionalDirectorHistory({
  query,
}: {
  query: ReturnType<typeof useRegionalDirectors>['history'];
}) {
  const t = useTranslations('affiliate.directors');
  const f = useFormatter();
  if (query.isPending) return <PageSkeleton />;
  if (query.isError)
    return (
      <ErrorState
        title={t('historyError')}
        retryLabel={t('retry')}
        onRetry={() => void query.refetch()}
      />
    );
  const rows = query.data.pages.flatMap((page) => page.items);
  if (!rows.length) return null;
  return (
    <section className={styles.history} aria-label={t('history')}>
      <b>{t('history')}</b>
      {rows.map((row) => (
        <div key={row.id} className={styles.historyRow}>
          <time dateTime={row.at}>
            {f.dateTime(new Date(row.at), {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Ho_Chi_Minh',
            })}
          </time>
          <b data-action={row.action}>{t(`actions.${row.action}`)}</b>
          <span>
            {row.memberName ?? '—'} · {t(`regions.${row.region}`)}
          </span>
          <small>{t('byActor', { name: row.actorName, role: row.actorRole })}</small>
          <span>{row.summary}</span>
        </div>
      ))}
      {query.hasNextPage ? (
        <Button loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {t('moreHistory')}
        </Button>
      ) : null}
    </section>
  );
}
