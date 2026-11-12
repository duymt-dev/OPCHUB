'use client';

import { useTranslations } from 'next-intl';
import { PROJECT_VIEWS, REVIEW_TABS, type ProjectView, type ReviewTab } from '../types';
import styles from './projects.module.css';
import { useNumberText } from '@/i18n/use-number-text';

const VIEW_ICON = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
} as const;

/** Tiêu đề thẻ "Kiểm duyệt dự án" + nút Lưới / Danh sách */
export function ProjectsHead({
  view,
  onView,
}: {
  view: ProjectView;
  onView: (v: ProjectView) => void;
}) {
  const t = useTranslations('projects');
  return (
    <div className={styles.headRow}>
      <div className={styles.headText}>
        <div className={styles.heading}>{t('heading')}</div>
        <div className={styles.headSub}>{t('headingSub')}</div>
      </div>
      <div className={styles.views} role="group" aria-label={t('viewLabel')}>
        {PROJECT_VIEWS.map((v) => {
          const label = v === 'grid' ? t('viewGrid') : t('viewList');
          return (
            <button
              key={v}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={view === v}
              className={`${styles.view} ${view === v ? styles.viewOn : ''}`}
              onClick={() => onView(v)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={VIEW_ICON[v]} />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TabsProps {
  active: ReviewTab;
  counts: Record<ReviewTab, number>;
  onChange: (tab: ReviewTab) => void;
}

/** 6 tab trạng thái; số "Chờ duyệt" > 0 thì pill đỏ (rvTabs) */
export function ReviewTabs({ active, counts, onChange }: TabsProps) {
  const numberText = useNumberText();
  const t = useTranslations('projects');
  return (
    <div className={styles.tabs} role="tablist" aria-label={t('tabsLabel')}>
      {REVIEW_TABS.map((k) => {
        const on = k === active;
        const hot = k === 'pending' && counts[k] > 0;
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={on}
            className={`${styles.tab} ${on ? styles.tabOn : ''}`}
            onClick={() => onChange(k)}
          >
            {/* nhãn bọc span để tìm được theo chữ chính xác (số đếm là phần tử riêng) */}
            <span>{t(`tabs.${k}`)}</span>
            <span className={`${styles.count} ${hot ? styles.hot : ''}`}>
              {numberText(counts[k])}
            </span>
          </button>
        );
      })}
    </div>
  );
}
