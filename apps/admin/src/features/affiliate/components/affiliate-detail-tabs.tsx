'use client';

import { useTranslations } from 'next-intl';
import type { AffiliateDetailParams } from '../types';
import styles from './affiliate.module.css';

export function AffiliateDetailTabs({
  tab,
  customers,
  update,
}: {
  tab: AffiliateDetailParams['tab'];
  customers: number;
  update: (patch: Partial<AffiliateDetailParams>) => void;
}) {
  const t = useTranslations('affiliate');
  return (
    <div className={`${styles.tabs} ${styles.detailTabs}`} role="tablist" aria-label={t('title')}>
      {(['months', 'customers'] as const).map((key) => (
        <button
          type="button"
          key={key}
          role="tab"
          aria-label={
            key === 'customers' ? `${t('tabs.agentCustomers')} ${customers}` : t('tabs.months')
          }
          data-ro-ok
          aria-selected={tab === key}
          className={`${styles.tab} ${tab === key ? styles.tabOn : ''}`}
          onClick={() => update({ tab: key, page: 1 })}
        >
          <span>{t(key === 'customers' ? 'tabs.agentCustomers' : 'tabs.months')}</span>
          <span className={styles.hint}>{key === 'customers' ? customers : null}</span>
        </button>
      ))}
    </div>
  );
}
