'use client';
import { useTranslations } from 'next-intl';
import { useBankReconcile } from '../hooks/use-bank-reconcile';
import { BankConfig } from './bank-config';
import { BankTransactions } from './bank-transactions';
import styles from './bank.module.css';

export function BankTab() {
  const t = useTranslations('settings.bank'),
    p = useBankReconcile();
  const retry = () => {
    void p.config.refetch();
    void p.list.refetch();
  };
  if (p.config.isError || p.list.isError)
    return (
      <div role="alert">
        {t('failed')}{' '}
        <button type="button" onClick={retry}>
          {t('retry')}
        </button>
      </div>
    );
  if (!p.config.data) return <div role="status">{t('loading')}</div>;
  return (
    <section className={styles.card} aria-label={t('heading')}>
      <div className={styles.configHead}>
        <div className={styles.title}>
          <h2>{t('heading')}</h2>
          <p>{t('sub')}</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={p.busy}
            onClick={() => p.test.mutate()}
          >
            {t('test')}
          </button>
          {p.config.data.canSimulate ? (
            <button
              type="button"
              className={styles.primary}
              disabled={p.busy}
              onClick={() => p.simulate.mutate()}
            >
              {t('simulate')}
            </button>
          ) : null}
        </div>
      </div>
      <BankConfig config={p.config.data} panel={p} />
      <BankTransactions panel={p} />
    </section>
  );
}
