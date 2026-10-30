'use client';

import { useTranslations } from 'next-intl';
import { affiliateMoney } from '../format';
import type { AffiliateParams } from '../types';
import styles from './affiliate.module.css';
import tabs from './affiliate-tabs.module.css';

export function AffiliateTabs({
  tab,
  onTab,
  counts,
  net,
}: {
  tab: AffiliateParams['tab'];
  onTab: (tab: AffiliateParams['tab']) => void;
  counts: { com: number | undefined; aff: number | undefined };
  net: number | undefined;
}) {
  const t = useTranslations('affiliate');
  return (
    <div className={styles.head}>
      <div className={styles.tabs} role="tablist" aria-label={t('title')}>
        {(['com', 'aff', 'gcfg', 'cfg'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            data-ro-ok
            aria-selected={tab === key}
            className={`${styles.tab} ${tab === key ? styles.tabOn : ''}`}
            onClick={() => onTab(key)}
          >
            {t(`tabs.${key}`)}
            {(key === 'com' || key === 'aff') && counts[key] !== undefined ? (
              <span className={styles.hint}>{counts[key]}</span>
            ) : null}
          </button>
        ))}
      </div>
      <span className={tabs.summary}>
        {t('net')} <b className={styles.net}>{net === undefined ? '—' : affiliateMoney(net)}</b>
      </span>
    </div>
  );
}
