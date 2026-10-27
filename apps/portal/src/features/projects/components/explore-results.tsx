'use client';

import { PROJECT_SORTS } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { fmtNumber } from '../model';
import { PAGE_SIZES } from '../explore-model';
import type { ExploreParams } from '../types';
import { Stroke } from './bits';
import styles from './explore.module.css';

const VIEWS = [
  { key: 'grid' as const, d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  { key: 'table' as const, d: 'M3 6h18M3 12h18M3 18h18' },
];

const isSort = (v: string): v is ExploreParams['sort'] =>
  (PROJECT_SORTS as readonly string[]).includes(v);
const isSize = (v: number): v is ExploreParams['size'] =>
  (PAGE_SIZES as readonly number[]).includes(v);

interface BarProps {
  params: ExploreParams;
  count: number;
  onChange: (patch: Partial<ExploreParams>) => void;
}

/** "N dự án", lưới / bảng, sắp xếp, cỡ trang */
export function ResultBar({ params, count, onChange }: BarProps) {
  const t = useTranslations('projects');
  return (
    <div className={styles.bar}>
      <span className={styles.barCount}>{t('results.count', { n: fmtNumber(count) })}</span>
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
            <Stroke size={16} width={1.8}>
              <path d={v.d} />
            </Stroke>
          </button>
        ))}
      </div>
      <select
        className={styles.select}
        value={params.sort}
        aria-label={t('toolbar.sortLabel')}
        onChange={(e) => isSort(e.target.value) && onChange({ sort: e.target.value, page: 1 })}
      >
        {PROJECT_SORTS.map((s) => (
          <option key={s} value={s}>
            {t(`sort.${s}`)}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        value={params.size}
        aria-label={t('results.sizeLabel')}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (isSize(n)) onChange({ size: n, page: 1 });
        }}
      >
        {PAGE_SIZES.map((n) => (
          <option key={n} value={n}>
            {t('results.size', { n })}
          </option>
        ))}
      </select>
    </div>
  );
}

interface PagerProps {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}

/** "Trang x / y" + "‹ Trước" / "Sau ›" (chỉ hiện khi > 1 trang) */
export function Pager({ page, pages, onPage }: PagerProps) {
  const t = useTranslations('projects.results');
  if (pages <= 1) return null;
  return (
    <div className={styles.pager}>
      <span className={styles.pagerInfo}>{t('page', { page, pages })}</span>
      <button
        type="button"
        className={styles.pagerBtn}
        onClick={() => onPage(Math.max(1, page - 1))}
      >
        {t('prev')}
      </button>
      <button
        type="button"
        className={styles.pagerBtn}
        onClick={() => onPage(Math.min(pages, page + 1))}
      >
        {t('next')}
      </button>
    </div>
  );
}
