'use client';

import type { AdminInvestorSummary } from '@opchub/shared/api-domains';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { money } from '../model';
import { INVESTOR_TABS, type InvestorTab } from '../types';
import styles from './investors.module.css';

/** 5 thẻ thống kê (prototype ivStats) */
export function InvestorStats({ s }: { s: AdminInvestorSummary | undefined }) {
  const locale = useLocale();
  const t = useTranslations('investors.stats');
  const items = [
    ['total', s ? String(s.total) : '—'],
    ['fund', s ? String(s.fund) : '—'],
    ['business', s ? String(s.business) : '—'],
    ['individual', s ? String(s.individual) : '—'],
    ['amount', s ? money(s.totalAmount, 'VND', locale) : '—'],
  ] as const;
  return (
    <div className={styles.stats}>
      {items.map(([k, v]) => (
        <div key={k} className={styles.stat}>
          <span className={styles.statLabel}>{t(k)}</span>
          <b className={styles.statValue}>{v}</b>
        </div>
      ))}
    </div>
  );
}

interface Props {
  q: string;
  kind: InvestorTab;
  summary: AdminInvestorSummary | undefined;
  onSearch: (q: string) => void;
  onKind: (k: InvestorTab) => void;
  onCsv: () => void;
}

const tabCount = (s: AdminInvestorSummary | undefined, k: InvestorTab) =>
  s ? String(k === 'all' ? s.total : s[k]) : '';

/** Tiêu đề + ô tìm + "Xuất CSV" + tab loại */
export function InvestorToolbar({ q, kind, summary, onSearch, onKind, onCsv }: Props) {
  const t = useTranslations('investors');
  // Giữ chữ đang gõ tại chỗ; URL cập nhật cùng lúc (useUrlParams)
  const [text, setText] = useState(q);
  return (
    <>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.heading}>{t('heading')}</h2>
          <span className={styles.sub}>{t('sub')}</span>
        </div>
        <input
          type="text"
          className={styles.search}
          value={text}
          placeholder={t('search')}
          aria-label={t('searchLabel')}
          onChange={(e) => {
            setText(e.target.value);
            onSearch(e.target.value);
          }}
        />
        <button type="button" className={styles.btn} onClick={onCsv}>
          {t('csv')}
        </button>
      </div>
      <div className={styles.tabs} role="radiogroup" aria-label={t('tabsLabel')}>
        {INVESTOR_TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            className={`${styles.tab} ${kind === k ? styles.tabOn : ''}`}
            onClick={() => onKind(k)}
          >
            {t(`tabs.${k}`)}
            <span className={styles.tabCount}>{tabCount(summary, k)}</span>
          </button>
        ))}
      </div>
    </>
  );
}
