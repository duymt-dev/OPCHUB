'use client';
import { useTranslations } from 'next-intl';
import { useConversion } from '../hooks/use-conversion';
import { ConversionGrid } from './conversion-grid';
import styles from './conversion.module.css';

export function ConversionTable() {
  const t = useTranslations('overview.conversion'),
    p = useConversion();
  const data = p.query.data;
  return (
    <section className={styles.card} aria-label={t('heading')}>
      <div className={styles.head}>
        <div>
          <h2>{t('heading')}</h2>
          <p>{t('sub')}</p>
        </div>
        <button
          type="button"
          className={styles.button}
          disabled={!data || p.csv.isPending}
          onClick={() => p.csv.mutate()}
        >
          {t('export')}
        </button>
      </div>
      {p.query.isPending ? <div role="status">{t('loading')}</div> : null}
      {p.query.isError ? (
        <div role="alert">
          {t('failed')}{' '}
          <button type="button" onClick={() => void p.query.refetch()}>
            {t('retry')}
          </button>
        </div>
      ) : null}
      {data ? <ConversionGrid data={data} /> : null}
    </section>
  );
}
