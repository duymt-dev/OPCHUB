'use client';
import { useTranslations } from 'next-intl';
import { useRenewal } from '../hooks/use-renewal';
import { RenewalConfig } from './renewal-config';
import { RenewalTable } from './renewal-table';
import styles from './renewal.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function RenewalTab() {
  const numberText = useNumberText();
  const t = useTranslations('settings.renewal');
  const p = useRenewal();
  if (p.error)
    return (
      <div role="alert">
        {t('failed')}{' '}
        <button type="button" onClick={p.retry}>
          {t('retry')}
        </button>
      </div>
    );
  if (!p.form) return <div role="status">{t('loading')}</div>;
  return (
    <section className={styles.card} aria-label={t('heading')}>
      <div className={styles.head}>
        <div className={styles.title}>
          <h2>{t('heading')}</h2>
          <p>{t('sub')}</p>
        </div>
        <button type="button" className={styles.primary} disabled={p.busy} onClick={p.save}>
          {t('save')}
        </button>
      </div>
      <RenewalConfig form={p.form} busy={p.busy} set={p.set} />
      {!p.form.channels.email && !p.form.channels.app ? (
        <div role="alert" className={styles.warning}>
          {t('noChannel')}
        </div>
      ) : null}
      <div className={styles.head}>
        <b className={styles.listHeading}>{t('list', { n: numberText(p.total) })}</b>
        <button
          type="button"
          className={styles.secondary}
          disabled={p.busy || p.loading}
          onClick={() => p.send({ all: true })}
        >
          {t('sendAll')}
        </button>
      </div>
      {p.list.isPending ? (
        <div role="status">{t('loading')}</div>
      ) : (
        <RenewalTable rows={p.rows} busy={p.busy} send={(id) => p.send({ userIds: [id] })} />
      )}
      {p.list.hasNextPage ? (
        <button
          type="button"
          className={styles.secondary}
          disabled={p.list.isFetchingNextPage}
          onClick={() => void p.list.fetchNextPage()}
        >
          {t('more')}
        </button>
      ) : null}
    </section>
  );
}
