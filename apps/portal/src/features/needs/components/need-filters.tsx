'use client';

import {
  NEED_TYPES,
  NEED_TYPES_ALWAYS,
  type NeedFacets,
  type NeedType,
} from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import base from './needs.module.css';
import styles from './list.module.css';

export type NeedView = 'grid' | 'rows';

interface Props {
  facets: NeedFacets;
  type: NeedType | 'all';
  q: string;
  province: string;
  field: string;
  view: NeedView;
  onType: (t: NeedType | 'all') => void;
  onQ: (q: string) => void;
  onProvince: (p: string) => void;
  onField: (f: string) => void;
  onView: (v: NeedView) => void;
}

const SEARCH_DELAY_MS = 300;
const byVi = (a: string, b: string) => a.localeCompare(b, 'vi');

/** Lọc theo chữ, gõ xong mới đẩy lên URL — `key={q}` ở nơi dùng để nạp lại khi URL đổi từ ngoài */
function SearchBox({ q, onQ }: { q: string; onQ: (q: string) => void }) {
  const t = useTranslations('needs.filter');
  const [text, setText] = useState(q);
  useEffect(() => {
    if (text === q) return;
    const id = window.setTimeout(() => onQ(text), SEARCH_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [text, q, onQ]);
  return (
    <div className={styles.search}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(0,0,0,0.45)"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('search')}
        aria-label={t('search')}
      />
    </div>
  );
}

function ViewIcon({ v }: { v: NeedView }) {
  if (v === 'grid')
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    );
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

/**
 * Chip loại (luôn hiện 5 loại đầu, loại khác chỉ khi có nhu cầu đang mở), ô tìm, tỉnh, ngành,
 * dạng lưới / danh sách — số đếm theo toàn bộ nhu cầu đang mở như prototype.
 */
export function NeedFilters(p: Props) {
  const t = useTranslations('needs');
  const counts = new Map(p.facets.type.map((f) => [f.value, f.count]));
  const types = NEED_TYPES.filter(
    (k) => NEED_TYPES_ALWAYS.includes(k) || (counts.get(k) ?? 0) > 0 || p.type === k,
  );
  const chips = [
    { key: 'all' as const, label: t('filter.all'), n: p.facets.total },
    ...types.map((k) => ({ key: k, label: t(`type.${k}`), n: counts.get(k) ?? 0 })),
  ];
  const options = (list: NeedFacets['province'], cur: string) =>
    [...new Set([...list.map((f) => f.value), ...(cur ? [cur] : [])])].sort(byVi);
  return (
    <div className={`${base.card} ${styles.filters}`}>
      <div className={styles.types}>
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={p.type === c.key}
            className={`${styles.type} ${p.type === c.key ? styles.typeOn : ''}`}
            onClick={() => p.onType(c.key)}
          >
            {c.label}
            <b>{c.n}</b>
          </button>
        ))}
      </div>
      <SearchBox key={p.q} q={p.q} onQ={p.onQ} />
      <select
        className={styles.select}
        value={p.province}
        aria-label={t('filter.province')}
        onChange={(e) => p.onProvince(e.target.value)}
      >
        <option value="">{t('filter.province')}</option>
        {options(p.facets.province, p.province).map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        value={p.field}
        aria-label={t('filter.field')}
        onChange={(e) => p.onField(e.target.value)}
      >
        <option value="">{t('filter.field')}</option>
        {options(p.facets.field, p.field).map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <div className={styles.views}>
        {(['grid', 'rows'] as const).map((v) => (
          <button
            key={v}
            type="button"
            title={t(`filter.${v}`)}
            aria-label={t(`filter.${v}`)}
            aria-pressed={p.view === v}
            className={`${styles.view} ${p.view === v ? styles.viewOn : ''}`}
            onClick={() => p.onView(v)}
          >
            <ViewIcon v={v} />
          </button>
        ))}
      </div>
    </div>
  );
}
