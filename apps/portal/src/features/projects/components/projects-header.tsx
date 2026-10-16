'use client';

import { Icon, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import styles from './explore.module.css';

/** Tiêu đề trang (pageTitle/pageSub của prototype) + ô khoảng ngày */
export function ProjectsPageHeader() {
  const t = useTranslations('projects.page');
  return (
    <PageHeader
      title={t('title')}
      subtitle={t('sub')}
      extra={
        <div className={styles.dateRange}>
          <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
          {t('dateRange')}
          <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
        </div>
      }
    />
  );
}

interface ScopeProps {
  active: 'explore' | 'mine';
  exploreCount: number;
  mineCount: number;
  onScope: (s: 'explore' | 'mine') => void;
  onNew: () => void;
}

/** Tab "Khám phá dự án N" / "Dự án của tôi N" + nút "+ Đăng dự án của bạn" */
export function ScopeTabs({ active, exploreCount, mineCount, onScope, onNew }: ScopeProps) {
  const t = useTranslations('projects.scope');
  const tabs = [
    { key: 'explore' as const, label: t('explore'), n: exploreCount },
    { key: 'mine' as const, label: t('mine'), n: mineCount },
  ];
  return (
    <div className={styles.scopeRow}>
      <div className={styles.scopeTabs} role="tablist">
        {tabs.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={active === s.key}
            className={`${styles.scopeTab} ${active === s.key ? styles.scopeOn : ''}`}
            onClick={() => onScope(s.key)}
          >
            <span>{s.label}</span>
            <span className={styles.scopeN}>{s.n}</span>
          </button>
        ))}
      </div>
      <button type="button" className={styles.newBtn} onClick={onNew}>
        <span className={styles.plus}>+</span>
        {t('new')}
      </button>
    </div>
  );
}
