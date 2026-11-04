'use client';

import type { MarketingSummary } from '@opchub/shared/api-domains';
import { DateRangePicker, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRovingTabs } from '../hooks/use-roving-tabs';
import { statValues } from '../model';
import { MARKETING_TABS, type MarketingTab } from '../types';
import styles from './marketing.module.css';

export function MarketingHeader() {
  const t = useTranslations('marketing');
  return <PageHeader title={t('title')} subtitle={t('sub')} extra={<DateRangePicker />} />;
}

const STAT_KEYS = ['campaigns', 'sent', 'open', 'welcome'] as const;

export function MarketingStats({ summary }: { summary: MarketingSummary | undefined }) {
  const t = useTranslations('marketing.stats');
  const v = statValues(summary);
  return (
    <div className={styles.stats}>
      {STAT_KEYS.map((k) => (
        <div key={k} className={styles.stat}>
          <span className={styles.statLabel}>{t(k)}</span>
          <b className={styles.statValue}>{v[k]}</b>
        </div>
      ))}
    </div>
  );
}

/** Thanh tab + nút "+ Tạo chiến dịch" (chỉ ở tab Chiến dịch) như prototype */
export function MarketingTabs({
  tab,
  onTab,
  onCreate,
}: {
  tab: MarketingTab;
  onTab: (t: MarketingTab) => void;
  onCreate: () => void;
}) {
  const t = useTranslations('marketing');
  const { setRef, onKeyDown } = useRovingTabs(MARKETING_TABS, onTab);
  return (
    <div className={styles.head}>
      <div className={styles.tablist} role="tablist" aria-label={t('tabsLabel')}>
        {MARKETING_TABS.map((k, i) => (
          <button
            key={k}
            ref={setRef(i)}
            type="button"
            role="tab"
            id={`mk-tab-${k}`}
            aria-controls="mk-panel"
            aria-selected={tab === k}
            tabIndex={tab === k ? 0 : -1}
            className={`${styles.tab} ${tab === k ? styles.tabOn : ''}`}
            onClick={() => onTab(k)}
            onKeyDown={onKeyDown}
          >
            {t(`tabs.${k}`)}
          </button>
        ))}
      </div>
      {tab === 'campaigns' ? (
        <button type="button" className={styles.create} onClick={onCreate}>
          {t('create')}
        </button>
      ) : null}
    </div>
  );
}
