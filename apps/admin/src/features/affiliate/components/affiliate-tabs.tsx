'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useLayoutEffect, useRef } from 'react';
import { affiliateMoney } from '../format';
import type { AffiliateParams } from '../types';
import styles from './affiliate.module.css';
import { useNumberText } from '@/i18n/use-number-text';

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
  const numberText = useNumberText();
  const locale = useLocale();
  const t = useTranslations('affiliate');
  const tabs = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = tabs.current;
    const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !selected) return;
    const viewport = list.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    list.scrollLeft +=
      item.left < viewport.left
        ? item.left - viewport.left
        : Math.max(0, item.right - viewport.right);
  }, [tab, counts.com, counts.aff, counts.gdv]);
  return (
    <div className={styles.head}>
      <div ref={tabs} className={styles.tabs} role="tablist" aria-label={t('title')}>
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
              <span className={styles.hint}>{numberText(counts.gdv)}</span>
            )}
            {(key === 'com' || key === 'aff') && counts[key] !== undefined ? (
              <span className={styles.hint}>{numberText(counts[key])}</span>
            ) : null}
          </button>
        ))}
      </div>
      <span>
        {t('net')}{' '}
        <b className={styles.net}>{net === undefined ? '—' : affiliateMoney(net, locale)}</b>
      </span>
    </div>
  );
}
