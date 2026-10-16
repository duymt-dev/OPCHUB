'use client';

import type { ServiceRequestSummary } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { STATUS_TONE } from '../model';
import { REQUEST_FILTERS, REQUEST_STATUS_TABS, type RequestFilter } from '../types';
import styles from './requests.module.css';

/** 6 thẻ thống kê theo trạng thái (prototype rqStats) */
export function RequestStats({ s }: { s: ServiceRequestSummary | undefined }) {
  const t = useTranslations('requests.status');
  return (
    <div className={styles.stats}>
      {REQUEST_STATUS_TABS.map((k) => (
        <div key={k} className={styles.stat}>
          <span className={styles.statLabel}>{t(k)}</span>
          <b className={`${styles.statValue} ${styles[STATUS_TONE[k]]}`}>
            {s ? s.byStatus[k] : '—'}
          </b>
        </div>
      ))}
    </div>
  );
}

interface Props {
  q: string;
  status: RequestFilter;
  summary: ServiceRequestSummary | undefined;
  onSearch: (q: string) => void;
  onStatus: (s: RequestFilter) => void;
  onCsv: () => void;
}

const count = (s: ServiceRequestSummary | undefined, k: RequestFilter) =>
  s ? String(k === 'all' ? s.total : s.byStatus[k]) : '';

/** Tiêu đề + chú thích tiến trình + ô tìm + "Xuất CSV" + chip trạng thái */
export function RequestToolbar({ q, status, summary, onSearch, onStatus, onCsv }: Props) {
  const t = useTranslations('requests');
  const [text, setText] = useState(q);
  return (
    <>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.heading}>{t('heading')}</h2>
          <span className={styles.sub}>{t('pipeline')}</span>
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
      <div className={styles.chips} role="radiogroup" aria-label={t('filterLabel')}>
        {REQUEST_FILTERS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={status === k}
            className={`${styles.chip} ${status === k ? styles.chipOn : ''}`}
            onClick={() => onStatus(k)}
          >
            {k === 'all' ? t('all') : t(`status.${k}`)}
            <span className={styles.chipCount}>{count(summary, k)}</span>
          </button>
        ))}
      </div>
    </>
  );
}
