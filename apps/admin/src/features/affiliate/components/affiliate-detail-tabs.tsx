'use client';

import { useTranslations } from 'next-intl';
import type { AffiliateDetailTabsProps } from '../types';
import { useAffiliateTabVisibility } from '../hooks/use-affiliate-tab-visibility';
import styles from './affiliate.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function AffiliateDetailTabs({ tab, customers, update }: AffiliateDetailTabsProps) {
  const numberText = useNumberText();
  const t = useTranslations('affiliate');
  const ref = useAffiliateTabVisibility(tab, customers);
  return (
    <div
      ref={ref}
      className={`${styles.tabs} ${styles.detailTabs}`}
      role="tablist"
      aria-label={t('title')}
    >
      {(['months', 'customers'] as const).map((key) => (
        <button
          type="button"
          key={key}
          role="tab"
          aria-label={
            key === 'customers'
              ? `${t('tabs.agentCustomers')}${customers === undefined ? '' : ` ${numberText(customers)}`}`
              : t('tabs.months')
          }
          data-ro-ok
          aria-selected={tab === key}
          className={`${styles.tab} ${tab === key ? styles.tabOn : ''}`}
          onClick={() => update({ tab: key, page: 1 })}
        >
          <span>{t(key === 'customers' ? 'tabs.agentCustomers' : 'tabs.months')}</span>
          <span className={styles.hint}>{key === 'customers' ? numberText(customers) : null}</span>
        </button>
      ))}
    </div>
  );
}
