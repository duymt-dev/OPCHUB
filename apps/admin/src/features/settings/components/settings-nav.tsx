'use client';

import { useTranslations } from 'next-intl';
import { TAB_ICON, type SettingsTab } from '../types';
import styles from './settings.module.css';
import { useQuery } from '@tanstack/react-query';
import { aiKey, fetchAiSettings } from '../ai-api';
import llmStyles from './ai/ai.module.css';
import { useNumberText } from '@/i18n/use-number-text';

/**
 * D-33 SSO + Ngôn ngữ: ngoài 7 mục của prototype v4. Ở điện thoại ẩn như v4 (D-89); màn rộng
 * vẫn hiện để quản trị bảo mật / ngôn ngữ (Q-V4-622-1); `?tab=` vẫn mở được ở mọi khung.
 */
const EXTRA: ReadonlySet<SettingsTab> = new Set(['sso', 'languages']);

/** Danh sách tab dọc 240px (prototype stTabs, lọc theo khoá — RB-R06) + SSO, Ngôn ngữ theo D-33 */
export function SettingsNav({
  tabs,
  tab,
  counts,
  onTab,
}: {
  tabs: readonly SettingsTab[];
  tab: SettingsTab;
  counts: { categories: number; languages: number; roles: number };
  onTab: (t: SettingsTab) => void;
}) {
  const numberText = useNumberText();
  const t = useTranslations('settings');
  const ai = useQuery({ queryKey: aiKey, queryFn: fetchAiSettings, enabled: tabs.includes('llm') });
  return (
    <nav
      className={`${styles.nav} ${tab === 'llm' ? llmStyles.mobileNav : ''}`}
      aria-label={t('tabsLabel')}
    >
      {tabs.map((k) => {
        const on = k === tab;
        return (
          <button
            key={k}
            type="button"
            aria-current={on ? 'page' : undefined}
            className={`${styles.navItem} ${on ? styles.navOn : ''} ${EXTRA.has(k) && !on ? styles.navExtra : ''}`}
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
                {t(`tabSub.${k}`, {
                  n: numberText(
                    k === 'llm'
                      ? (ai.data?.providers.filter((p) => p.enabled).length ?? 0)
                      : k === 'languages'
                        ? counts.languages
                        : k === 'roles'
                          ? counts.roles
                          : counts.categories,
                  ),
                })}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
