'use client';

import { useTranslations } from 'next-intl';
import { formatCount } from '../model';
import {
  EVENT_MODES,
  EVENT_STATUSES,
  EVENT_VIEWS,
  type EventModeFilter,
  type EventsParams,
  type EventStats,
} from '../types';
import styles from './events.module.css';
import { ICON, Svg } from './svg';

const TONES = {
  blue: styles.toneBlue,
  green: styles.toneGreen,
  amber: styles.toneAmber,
  violet: styles.toneViolet,
};

/** 4 thẻ thống kê (aeStats) */
export function EventStatsRow({ s }: { s: EventStats }) {
  const t = useTranslations('events.stats');
  const items = [
    { label: t('upcoming'), value: String(s.upcoming), icon: ICON.calendar, tone: TONES.blue },
    {
      label: t('registrations'),
      value: formatCount(s.registrations),
      icon: ICON.users,
      tone: TONES.green,
    },
    { label: t('fillRate'), value: `${s.fillRate}%`, icon: ICON.pie, tone: TONES.amber },
    { label: t('online'), value: String(s.online), icon: ICON.screen, tone: TONES.violet },
  ];
  return (
    <div className={styles.stats}>
      {items.map((it) => (
        <div key={it.label} className={styles.stat}>
          <span className={`${styles.statIcon} ${it.tone}`}>
            <Svg d={it.icon} size={20} />
          </span>
          <div className={styles.statText}>
            <span className={styles.statLabel}>{it.label}</span>
            <span className={styles.statValue}>{it.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const isMode = (v: string): v is EventModeFilter => (EVENT_MODES as readonly string[]).includes(v);

interface ToolbarProps {
  params: EventsParams;
  onChange: (patch: Partial<EventsParams>) => void;
  onCreate: () => void;
}

/** Tìm, tab trạng thái, hình thức, "+ Tạo sự kiện", Lưới / Danh sách */
export function EventsToolbar({ params, onChange, onCreate }: ToolbarProps) {
  const t = useTranslations('events');
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <Svg d={ICON.search} size={15} stroke="rgba(0,0,0,0.35)" />
        <input
          className={styles.searchInput}
          value={params.q}
          placeholder={t('toolbar.search')}
          aria-label={t('toolbar.search')}
          onChange={(e) => onChange({ q: e.target.value, page: 1 })}
        />
      </label>
      <div className={styles.seg} role="tablist" aria-label={t('toolbar.tabsLabel')}>
        {EVENT_STATUSES.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={params.status === k}
            className={`${styles.segItem} ${params.status === k ? styles.segOn : ''}`}
            onClick={() => onChange({ status: k, page: 1 })}
          >
            {t(`status.${k}`)}
          </button>
        ))}
      </div>
      <select
        className={styles.select}
        aria-label={t('toolbar.modeLabel')}
        value={params.mode}
        onChange={(e) => isMode(e.target.value) && onChange({ mode: e.target.value, page: 1 })}
      >
        {EVENT_MODES.map((m) => (
          <option key={m} value={m}>
            {t(`mode.${m}`)}
          </option>
        ))}
      </select>
      <button type="button" className={styles.create} onClick={onCreate}>
        <span className={styles.plus}>+</span>
        {t('toolbar.create')}
      </button>
      <div className={styles.views} role="group" aria-label={t('toolbar.viewLabel')}>
        {EVENT_VIEWS.map((v) => {
          const label = v === 'grid' ? t('toolbar.viewGrid') : t('toolbar.viewList');
          return (
            <button
              key={v}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={params.view === v}
              className={`${styles.view} ${params.view === v ? styles.viewOn : ''}`}
              onClick={() => onChange({ view: v })}
            >
              <Svg d={v === 'grid' ? ICON.grid : ICON.list} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
