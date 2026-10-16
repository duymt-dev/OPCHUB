'use client';

import { PROJECT_SORTS, PROJECT_STAGE_FILTERS } from '@opchub/shared/api-domains';
import type { ProjectStats } from '@opchub/shared/api-domains';
import { Icon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { STAGES } from '../model';
import type { ExploreParams } from '../types';
import { Stroke } from './bits';
import styles from './explore.module.css';

interface Props {
  params: ExploreParams;
  categories: ProjectStats['categories'];
  total: number;
  shown: number;
  onChange: (patch: Partial<ExploreParams>) => void;
}

const VIEWS = [
  { key: 'grid' as const, d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  { key: 'table' as const, d: 'M3 6h18M3 12h18M3 18h18' },
];

const isStage = (v: string): v is ExploreParams['stage'] =>
  v === 'all' || (PROJECT_STAGE_FILTERS as readonly string[]).includes(v);
const isSort = (v: string): v is ExploreParams['sort'] =>
  (PROJECT_SORTS as readonly string[]).includes(v);

/** Tìm, giai đoạn, sắp xếp, lưới/bảng, chip LĨNH VỰC, "N / M dự án" */
export function ExploreToolbar({ params, categories, total, shown, onChange }: Props) {
  const t = useTranslations('projects');
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolRow}>
        <label className={styles.search}>
          <Icon name="search" size={16} stroke="rgba(0,0,0,0.35)" />
          <input
            className={styles.searchInput}
            value={params.q}
            placeholder={t('toolbar.search')}
            aria-label={t('toolbar.search')}
            onChange={(e) => onChange({ q: e.target.value, page: 1 })}
          />
        </label>
        <select
          className={styles.select}
          value={params.stage}
          aria-label={t('table.stage')}
          onChange={(e) => isStage(e.target.value) && onChange({ stage: e.target.value, page: 1 })}
        >
          <option value="all">{t('toolbar.allStages')}</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {t(`stage.${s}`)}
            </option>
          ))}
          <option value="fund">{t('toolbar.fund')}</option>
        </select>
        <select
          className={styles.select}
          value={params.sort}
          aria-label="Sắp xếp"
          onChange={(e) => isSort(e.target.value) && onChange({ sort: e.target.value, page: 1 })}
        >
          {PROJECT_SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`sort.${s}`)}
            </option>
          ))}
        </select>
        <div className={styles.views} role="radiogroup">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="radio"
              aria-checked={params.view === v.key}
              title={t(`toolbar.${v.key}`)}
              className={`${styles.view} ${params.view === v.key ? styles.viewOn : ''}`}
              onClick={() => onChange({ view: v.key })}
            >
              <Stroke size={16}>
                <path d={v.d} />
              </Stroke>
            </button>
          ))}
        </div>
      </div>
      <CategoryChips
        params={params}
        categories={categories}
        total={total}
        shown={shown}
        onChange={onChange}
      />
    </div>
  );
}

/** Chip LĨNH VỰC + "N / M dự án" */
function CategoryChips({ params, categories, total, shown, onChange }: Props) {
  const t = useTranslations('projects');
  const chips = [{ name: 'all', color: '', count: total }, ...categories];
  return (
    <div className={styles.chipRow}>
      <span className={styles.chipHead}>{t('toolbar.categories')}</span>
      {chips.map((c) => {
        const on = params.cat === c.name;
        return (
          <button
            key={c.name}
            type="button"
            aria-pressed={on}
            className={`${styles.chip} ${on ? styles.chipOn : ''} ${c.count || on || c.name === 'all' ? '' : styles.chipDim}`}
            onClick={() => onChange({ cat: c.name, page: 1 })}
          >
            {c.color ? <i className={styles.dot} style={{ background: c.color }} /> : null}
            {c.name === 'all' ? t('toolbar.allCats') : c.name}{' '}
            <span className={styles.chipN}>{c.count}</span>
          </button>
        );
      })}
      <span className={styles.result}>{t('toolbar.result', { shown, total })}</span>
    </div>
  );
}
