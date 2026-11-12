'use client';

import {
  ADMIN_NEED_FILTERS,
  type AdminNeedFilter,
  type AdminNeedList,
} from '@opchub/shared/api-domains';
import { Icon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import styles from './needs.module.css';
import { useNumberText } from '@/i18n/use-number-text';

type Summary = AdminNeedList['summary'];

const KPI = [
  ['total', 'rgba(0,0,0,0.88)'],
  ['open', '#389E0D'],
  ['closed', 'rgba(0,0,0,0.65)'],
  ['hidden', '#CF1322'],
] as const;

const countOf = (s: Summary | undefined, k: AdminNeedFilter) =>
  s ? (k === 'all' ? s.total : s[k]) : 0;

/** Prototype `aKpi`: Tổng nhu cầu · Đang mở · Đã đóng · Admin đã ẩn */
export function NeedKpis({ s }: { s: Summary | undefined }) {
  const numberText = useNumberText();
  const t = useTranslations('needs.kpi');
  return (
    <div className={styles.kpis}>
      {KPI.map(([k, c]) => (
        <div key={k} className={styles.kpi}>
          <span className={styles.kpiLabel}>{t(k)}</span>
          <b className={styles.kpiValue} style={{ color: c }}>
            {s ? numberText(s[k]) : '—'}
          </b>
        </div>
      ))}
    </div>
  );
}

interface Props {
  q: string;
  status: AdminNeedFilter;
  summary: Summary | undefined;
  onSearch: (q: string) => void;
  onStatus: (s: AdminNeedFilter) => void;
}

/** Ô tìm (nhu cầu / gian hàng / tỉnh) + chip trạng thái kèm số + ghi chú (prototype `aFilters`) */
export function NeedToolbar({ q, status, summary, onSearch, onStatus }: Props) {
  const numberText = useNumberText();
  const t = useTranslations('needs');
  // Giữ chữ đang gõ tại chỗ; URL cập nhật cùng lúc (useUrlParams)
  const [text, setText] = useState(q);
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <Icon name="search" size={14} stroke="rgba(0,0,0,0.45)" />
        <input
          type="text"
          value={text}
          placeholder={t('search')}
          aria-label={t('search')}
          onChange={(e) => {
            setText(e.target.value);
            onSearch(e.target.value);
          }}
        />
      </label>
      <div className={styles.chips} role="radiogroup" aria-label={t('filtersLabel')}>
        {ADMIN_NEED_FILTERS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={status === k}
            data-ro-ok
            className={`${styles.chip} ${status === k ? styles.chipOn : ''}`}
            onClick={() => onStatus(k)}
          >
            {t(`filter.${k}`)} {numberText(countOf(summary, k))}
          </button>
        ))}
      </div>
      <span className={styles.grow} />
      <span className={styles.note}>{t('note')}</span>
    </div>
  );
}
