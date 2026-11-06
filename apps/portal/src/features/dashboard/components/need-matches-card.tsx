'use client';

import { Button, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useNeedMatches } from '../hooks/use-need-matches';
import { NeedMatchRow } from './need-match-row';
import styles from './need-matches.module.css';

/** BR-478–480: rule-based recommendations; intentionally retains prototype AI wording. */
export function NeedMatchesCard() {
  const t = useTranslations('dashboard.matches');
  const router = useRouter();
  const query = useNeedMatches();
  if (query.hidden) return null;
  const rows = query.data?.rows ?? [];
  const field = query.data?.storeField;
  return (
    <section className={styles.card} aria-label={t('title')} data-screen="need-matches">
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          >
            <path d="M11 2 13 7 18 9 13 11 11 16 9 11 4 9 9 7ZM19 14 20 17 23 18 20 19 19 22 18 19 15 18 18 17Z" />
          </svg>
        </span>
        <div className={styles.heading}>
          <h2>{t('title')}</h2>
          <span>{t('sub', { n: rows.length })}</span>
        </div>
        <Button
          className={styles.action ?? ''}
          onClick={() =>
            router.push(field ? `/needs?field=${encodeURIComponent(field)}` : '/needs')
          }
        >
          {t('all')}
        </Button>
      </div>
      {query.isPending ? (
        <div className={styles.state} aria-busy="true">
          <Skeleton active paragraph={{ rows: 3 }} title={false} />
        </div>
      ) : query.isError ? (
        <div className={styles.state} role="alert">
          {t('error')} <Button onClick={() => void query.refetch()}>{t('retry')}</Button>
        </div>
      ) : rows.length ? (
        rows.map((row) => <NeedMatchRow row={row} key={row.id} />)
      ) : (
        <div className={styles.state}>{t('none')}</div>
      )}
    </section>
  );
}
