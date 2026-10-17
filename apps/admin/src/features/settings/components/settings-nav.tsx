'use client';

import { useTranslations } from 'next-intl';
import { SETTINGS_TABS, TAB_ICON, type SettingsTab } from '../types';
import styles from './settings.module.css';

/** Danh sách tab dọc 240px (prototype stTabs) + SSO, Ngôn ngữ theo D-33 */
export function SettingsNav({
  tab,
  counts,
  onTab,
}: {
  tab: SettingsTab;
  counts: { categories: number; languages: number };
  onTab: (t: SettingsTab) => void;
}) {
  const t = useTranslations('settings');
  return (
    <nav className={styles.nav} aria-label={t('tabsLabel')}>
      {SETTINGS_TABS.map((k) => {
        const on = k === tab;
        return (
          <button
            key={k}
            type="button"
            aria-current={on ? 'page' : undefined}
            className={`${styles.navItem} ${on ? styles.navOn : ''}`}
            onClick={() => onTab(k)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d={TAB_ICON[k]} />
            </svg>
            <span className={styles.navText}>
              <span className={styles.navLabel}>{t(`tabs.${k}`)}</span>
              <span className={styles.navSub}>
                {t(`tabSub.${k}`, { n: k === 'languages' ? counts.languages : counts.categories })}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
