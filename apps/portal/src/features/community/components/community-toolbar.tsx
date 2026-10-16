'use client';

import { Icon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import {
  COMMUNITY_FILTERS,
  COMMUNITY_SORTS,
  type CommunityParams,
  type CommunitySort,
  type RegionCount,
} from '../types';
import styles from './community.module.css';

interface Props {
  params: CommunityParams;
  regions: RegionCount[];
  shown: number;
  total: number;
  onChange: (patch: Partial<CommunityParams>) => void;
}

const isSort = (v: string): v is CommunitySort =>
  (COMMUNITY_SORTS as readonly string[]).includes(v);

/** Ô tìm (có ×), lọc Tất cả/Đã tham gia/Chưa tham gia, Sắp xếp, chip KHU VỰC */
export function CommunityToolbar({ params, regions, shown, total, onChange }: Props) {
  const t = useTranslations('community');
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolRow}>
        <div className={styles.search}>
          <Icon name="search" size={18} stroke="rgba(0,0,0,0.45)" />
          <input
            className={styles.searchInput}
            value={params.q}
            placeholder={t('toolbar.search')}
            aria-label={t('toolbar.search')}
            onChange={(e) => onChange({ q: e.target.value, page: 1 })}
          />
          {params.q ? (
            <button
              type="button"
              className={styles.clear}
              aria-label={t('toolbar.clear')}
              onClick={() => onChange({ q: '', page: 1 })}
            >
              ×
            </button>
          ) : null}
        </div>
        <div className={styles.segment} role="radiogroup" aria-label={t('toolbar.filterLabel')}>
          {COMMUNITY_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={params.filter === f}
              className={`${styles.segItem} ${params.filter === f ? styles.segOn : ''}`}
              onClick={() => onChange({ filter: f, page: 1 })}
            >
              {t(`filter.${f}`)}
            </button>
          ))}
        </div>
        <label className={styles.sort}>
          {t('toolbar.sort')}
          <select
            className={styles.sortSelect}
            value={params.sort}
            onChange={(e) => isSort(e.target.value) && onChange({ sort: e.target.value, page: 1 })}
          >
            {COMMUNITY_SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`sortBy.${s}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.regionRow}>
        <span className={styles.regionHeading}>{t('toolbar.regionHeading')}</span>
        {regions.map((r) => (
          <button
            key={r.key}
            type="button"
            aria-pressed={params.region === r.key}
            className={`${styles.chip} ${params.region === r.key ? styles.chipOn : ''}`}
            onClick={() => onChange({ region: r.key, page: 1 })}
          >
            {r.key === 'all' ? t('region.all') : r.key}{' '}
            <span className={styles.chipN}>{r.count}</span>
          </button>
        ))}
        <span className={styles.result}>{t('toolbar.result', { shown, total })}</span>
      </div>
    </div>
  );
}
