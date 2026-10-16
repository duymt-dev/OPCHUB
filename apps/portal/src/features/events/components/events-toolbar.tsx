'use client';

import { Icon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { EVENT_FILTERS, type EventsParams } from '../types';
import styles from './events.module.css';

interface Props {
  params: EventsParams;
  shown: number;
  total: number;
  onChange: (patch: Partial<EventsParams>) => void;
}

/** Ô tìm + chip lọc Tất cả / Đã đăng ký / Online / Offline (P-50, P-51) */
export function EventsToolbar({ params, shown, total, onChange }: Props) {
  const t = useTranslations('events');
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <Icon name="search" size={18} stroke="rgba(0,0,0,0.45)" />
        <input
          value={params.q}
          placeholder={t('toolbar.search')}
          onChange={(e) => onChange({ q: e.target.value })}
        />
      </label>
      <div className={styles.chips} role="radiogroup" aria-label={t('toolbar.filterLabel')}>
        {EVENT_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={params.filter === f}
            className={styles.chip}
            onClick={() => onChange({ filter: f })}
          >
            {t(`filter.${f}`)}
          </button>
        ))}
      </div>
      <span className={styles.result}>{t('toolbar.result', { shown, total })}</span>
    </div>
  );
}
