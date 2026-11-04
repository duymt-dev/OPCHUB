'use client';

import { useTranslations } from 'next-intl';
import { affiliateMoney } from '../format';
import type { AffiliateParams } from '../types';
import styles from './affiliate.module.css';

export function AffiliateTabs({
  tab,
  onTab,
  counts,
  net,
}: {
  tab: AffiliateParams['tab'];
  onTab: (tab: AffiliateParams['tab']) => void;
  counts: { com: number | undefined; aff: number | undefined; gdv?: number | undefined };
  net: number | undefined;
}) {
  const t = useTranslations('affiliate');
  return (
    <div className={styles.head}>
      <div className={styles.tabs} role="tablist" aria-label={t('title')}>
        {(['com', 'aff', 'gdv', 'gcfg', 'cfg'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            data-ro-ok
            aria-selected={tab === key}
            className={`${styles.tab} ${tab === key ? styles.tabOn : ''}`}
            onClick={() => onTab(key)}
          >
            {key === 'gdv' ? t('regional.share.director') : t(`tabs.${key}`)}
            {key === 'gdv' && counts.gdv !== undefined && (
              <span className={styles.hint}>{counts.gdv}</span>
            )}
            {(key === 'com' || key === 'aff') && counts[key] !== undefined ? (
              <span className={styles.hint}>{counts[key]}</span>
            ) : null}
          </button>
        ))}
      </div>
      <span>
        {t('net')} <b className={styles.net}>{net === undefined ? '—' : affiliateMoney(net)}</b>
      </span>
    </div>
  );
}
