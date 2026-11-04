'use client';

import { DateRangePicker, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { RequestTab } from '../types';
import styles from './requests.module.css';

const TABS: RequestTab[] = ['list', 'catalog'];

export function RequestsHeader() {
  const t = useTranslations('requests');
  return <PageHeader title={t('title')} subtitle=" " extra={<DateRangePicker />} />;
}

/** Tab "Yêu cầu đăng ký" / "Danh mục dịch vụ" (gạch chân xanh như prototype rqTabs) */
export function ScreenTabs({
  tab,
  counts,
  onTab,
}: {
  tab: RequestTab;
  counts: Record<RequestTab, number | undefined>;
  onTab: (t: RequestTab) => void;
}) {
  const t = useTranslations('requests.tabs');
  return (
    <div className={styles.tabs} role="tablist" aria-label={t('label')}>
      {TABS.map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={tab === k}
          className={`${styles.tab} ${tab === k ? styles.tabOn : ''}`}
          onClick={() => onTab(k)}
        >
          {t(k)}
          <span className={styles.tabCount}>{counts[k] ?? ''}</span>
        </button>
      ))}
    </div>
  );
}
