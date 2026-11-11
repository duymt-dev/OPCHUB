'use client';

import { useDomainLabels } from '@/i18n/domain-labels';

import { useLocale, useTranslations } from 'next-intl';
import { formatCount, industriesOf, kindCount, regionCount } from '../model';
import {
  GROUP_SORTS,
  GROUP_VIEWS,
  KIND_FILTERS,
  REGIONS,
  type AdminGroup,
  type GroupSort,
  type GroupsParams,
  type GroupStats,
} from '../types';
import styles from './groups.module.css';
import { useNumberText } from '@/i18n/use-number-text';

const VIEW_ICON = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
} as const;

const isSort = (v: string): v is GroupSort => (GROUP_SORTS as readonly string[]).includes(v);

function Svg({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

interface HeadProps {
  view: GroupsParams['view'];
  onCreate: () => void;
  onExport: () => void;
  onView: (v: GroupsParams['view']) => void;
}

/** Tiêu đề thẻ + Tạo nhóm / Xuất dữ liệu / Lưới–Danh sách */
export function GroupsHead({ view, onCreate, onExport, onView }: HeadProps) {
  const t = useTranslations('groups.list');
  return (
    <div className={styles.headRow}>
      <div className={styles.heading}>{t('heading')}</div>
      <button type="button" className={styles.btnPrimary} onClick={onCreate}>
        <span className={styles.plus}>+</span>
        {t('create')}
      </button>
      <button type="button" className={styles.btnGhost} onClick={onExport}>
        <Svg d="M12 3v12M7 10l5 5 5-5M4 19h16" size={14} />
        {t('export')}
      </button>
      <div className={styles.views} role="group" aria-label={t('viewLabel')}>
        {GROUP_VIEWS.map((v) => {
          const label = v === 'grid' ? t('viewGrid') : t('viewList');
          return (
            <button
              key={v}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={view === v}
              className={`${styles.view} ${view === v ? styles.viewOn : ''}`}
              onClick={() => onView(v)}
            >
              <Svg d={VIEW_ICON[v]} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GroupsStats({ s }: { s: GroupStats }) {
  const locale = useLocale();
  const t = useTranslations('groups.list.stats');
  const items = [
    [t('groups'), formatCount(s.groups, locale)],
    [t('provinces'), t('provincesValue', { count: formatCount(s.provinces, locale) })],
    [t('members'), formatCount(s.members, locale)],
    [t('weekly'), formatCount(s.weekly, locale)],
  ];
  return (
    <div className={styles.stats}>
      {items.map(([l, v]) => (
        <div key={l} className={styles.stat}>
          <span className={styles.statLabel}>{l}</span>
          <b className={styles.statValue}>{v}</b>
        </div>
      ))}
    </div>
  );
}

interface FilterProps {
  all: AdminGroup[];
  params: GroupsParams;
  onChange: (patch: Partial<GroupsParams>) => void;
}

/** Miền (Tất cả / Bắc / Trung / Nam), loại nhóm + ngành (D-89 v4), ô tìm, sắp xếp */
export function GroupsFilters({ all, params, onChange }: FilterProps) {
  const numberText = useNumberText();
  const t = useTranslations('groups.list');
  const labels = useDomainLabels();
  return (
    <>
      <div className={styles.filters}>
        <div className={styles.regions} role="group" aria-label={t('regionLabel')}>
          {REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={params.region === r}
              className={`${styles.region} ${params.region === r ? styles.regionOn : ''}`}
              onClick={() => onChange({ region: r, page: 1 })}
            >
              {r === 'all' ? t('regionAll') : labels.canonicalRegion(r)}
              <span className={styles.regionN}>{numberText(regionCount(all, r))}</span>
            </button>
          ))}
        </div>
        <div className={styles.regions} role="group" aria-label={t('kindLabel')}>
          {KIND_FILTERS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={params.kind === k}
              className={`${styles.region} ${params.kind === k ? styles.regionOn : ''}`}
              onClick={() => onChange({ kind: k, page: 1 })}
            >
              {t(`kind.${k}`)}
              <span className={styles.regionN}>{numberText(kindCount(all, k))}</span>
            </button>
          ))}
        </div>
        <select
          className={`${styles.sort} ${styles.industry}`}
          value={params.ind}
          aria-label={t('indLabel')}
          onChange={(e) =>
            onChange({
              ind: e.target.value,
              kind: e.target.value ? 'industry' : params.kind,
              page: 1,
            })
          }
        >
          <option value="">{t('indAll')}</option>
          {industriesOf(all).map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <input
          className={styles.search}
          value={params.q}
          placeholder={t('search')}
          aria-label={t('search')}
          onChange={(e) => onChange({ q: e.target.value, page: 1 })}
        />
        <select
          className={styles.sort}
          value={params.sort}
          aria-label={t('sortLabel')}
          onChange={(e) => isSort(e.target.value) && onChange({ sort: e.target.value, page: 1 })}
        >
          {GROUP_SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`sort.${s}`)}
            </option>
          ))}
        </select>
      </div>
      {/* D-71: bỏ duyệt vào nhóm — prototype v4 bỏ dòng "Yêu cầu tham gia nhóm do chủ nhóm… duyệt" */}
    </>
  );
}
