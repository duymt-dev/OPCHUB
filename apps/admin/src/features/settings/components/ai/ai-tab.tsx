'use client';
import { useTranslations } from 'next-intl';
import { useAiSettings } from '../../hooks/use-ai-settings';
import { AiProviderGrid } from './ai-provider-grid';
import { AiProviderDetail } from './ai-provider-detail';
import { AiAllocation } from './ai-allocation';
import { AiLimits } from './ai-limits';
import styles from './ai.module.css';
export function AiTab() {
  const t = useTranslations('settings.ai');
  const p = useAiSettings();
  if (p.query.error)
    return (
      <div role="alert">
        {t('failed')}{' '}
        <button
          type="button"
          onClick={() => {
            void p.query.refetch();
          }}
        >
          {t('retry')}
        </button>
      </div>
    );
  if (!p.form) return <div role="status">{t('loading')}</div>;
  return (
    <div className={styles.stack}>
      <section className={`${styles.card} ${styles.catalog}`} aria-label={t('heading')}>
        <div className={styles.row}>
          <h2>{t('heading')}</h2>
          <span>{t('count', { n: p.form.providers.filter((r) => r.enabled).length })}</span>
        </div>
        <p>{t('sub')}</p>
        <AiProviderGrid p={p} />
      </section>
      <AiProviderDetail p={p} key={p.selected} />
      <AiAllocation p={p} />
      <AiLimits p={p} />
    </div>
  );
}
