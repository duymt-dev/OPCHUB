'use client';

import type { StoreFacets, StoreItemKind } from '@opchub/shared/api-domains';
import { STORE_FIELDS } from '@opchub/shared/fixtures';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { MultiKey } from '../hooks/use-explore-params';
import { STORE_AUDIENCE_ORDER } from '../model';
import styles from './explore.module.css';

const KIND_ICONS: Record<'all' | StoreItemKind, string> = {
  all: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  product: 'M21 8l-9-5-9 5 9 5zM3 8v8l9 5 9-5V8M12 13v8',
  service:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z',
};

interface Option {
  value: string;
  label: string;
  n: number;
}

function Group(p: {
  title: string;
  open: boolean;
  onToggle: () => void;
  options: Option[];
  selected: string[];
  onPick: (v: string) => void;
}) {
  return (
    <div className={styles.group}>
      <button type="button" className={styles.groupHead} onClick={p.onToggle}>
        <span>{p.title}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ transform: p.open ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M6 9l6 6 6-6" stroke="rgba(0,0,0,0.55)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {p.open ? (
        <div className={styles.options}>
          {p.options.map((o) => {
            const on = p.selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                role="checkbox"
                aria-checked={on}
                className={styles.option}
                onClick={() => p.onPick(o.value)}
              >
                <span className={`${styles.box} ${on ? styles.boxOn : ''}`}>{on ? '✓' : ''}</span>
                <span className={styles.optL}>{o.label}</span>
                <span className={styles.optN}>({o.n})</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export interface FilterProps {
  facets: StoreFacets;
  kind: 'all' | StoreItemKind;
  selected: Record<MultiKey, string[]>;
  onKind: (k: 'all' | StoreItemKind) => void;
  onToggle: (key: MultiKey, v: string) => void;
  onReset: () => void;
}

/** Cột lọc trái (prototype `stSide`): số đếm theo toàn bộ gian hàng đang hiển thị */
export function ExploreFilters(p: FilterProps) {
  const t = useTranslations('stores');
  const [open, setOpen] = useState({ audience: true, field: false, province: false });
  const count = (rows: { value: string; count: number }[], v: string) =>
    rows.find((r) => r.value === v)?.count ?? 0;
  const kinds = [
    { k: 'all' as const, n: p.facets.total },
    { k: 'product' as const, n: p.facets.kind.product },
    { k: 'service' as const, n: p.facets.kind.service },
  ];
  const groups: { key: MultiKey; options: Option[] }[] = [
    {
      key: 'audience',
      options: STORE_AUDIENCE_ORDER.map((a) => ({
        value: a,
        label: t(`audience.${a}`),
        n: count(p.facets.audience, a),
      })),
    },
    {
      key: 'field',
      options: STORE_FIELDS.map((f) => ({
        value: f,
        label: f,
        n: count(p.facets.field, f),
      })).filter((o) => o.n > 0 || p.selected.field.includes(o.value)),
    },
    {
      key: 'province',
      options: p.facets.province.map((r) => ({ value: r.value, label: r.value, n: r.count })),
    },
  ];
  return (
    <aside className={styles.side} aria-label={t('filter.title')}>
      <div className={styles.sideHead}>
        <span>{t('filter.title')}</span>
        <button type="button" onClick={p.onReset}>
          {t('filter.reset')}
        </button>
      </div>
      <div className={styles.kinds}>
        <span className={styles.groupTitle}>{t('filter.kind')}</span>
        {kinds.map(({ k, n }) => (
          <button
            key={k}
            type="button"
            aria-pressed={p.kind === k}
            className={`${styles.kindBtn} ${p.kind === k ? styles.kindOn : ''}`}
            onClick={() => p.onKind(k)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d={KIND_ICONS[k]}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span className={styles.optL}>{t(k === 'all' ? 'filter.kindAll' : `filter.${k}`)}</span>
            <span className={styles.kindN}>{n}</span>
          </button>
        ))}
      </div>
      {groups.map((g) => (
        <Group
          key={g.key}
          title={t(`filter.${g.key}`)}
          open={open[g.key]}
          onToggle={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
          options={g.options}
          selected={p.selected[g.key]}
          onPick={(v) => p.onToggle(g.key, v)}
        />
      ))}
    </aside>
  );
}
