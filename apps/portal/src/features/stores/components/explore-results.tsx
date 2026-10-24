'use client';

import {
  STORE_PAGE_SIZE,
  STORE_SORTS,
  type StoreList,
  type StoreSort,
} from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LocalizedPagination } from '@/i18n/localized-ui';
import { StoreGridCard, StoreRow } from './store-card';
import styles from './explore.module.css';
import base from './stores.module.css';

interface Props {
  data: StoreList;
  sort: StoreSort;
  onSort: (s: StoreSort) => void;
  onPage: (p: number) => void;
}

const SORTS = new Set<string>(STORE_SORTS);

function ViewIcon({ v }: { v: 'grid' | 'rows' }) {
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Thanh kết quả + lưới / danh sách + phân trang 12 / trang */
export function ExploreResults({ data, sort, onSort, onPage }: Props) {
  const t = useTranslations('stores');
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'rows'>('grid');
  const open = (id: string) => router.push(`/stores/${encodeURIComponent(id)}`);
  return (
    <div className={styles.main}>
      <div className={styles.bar}>
        <span className={styles.total}>
          {t('results', { n: data.total.toLocaleString('vi-VN') })}
        </span>
        <div className={styles.views}>
          {(['grid', 'rows'] as const).map((v) => (
            <button
              key={v}
              type="button"
              title={t(v)}
              aria-label={t(v)}
              aria-pressed={view === v}
              className={`${styles.viewBtn} ${view === v ? styles.viewOn : ''}`}
              onClick={() => setView(v)}
            >
              <ViewIcon v={v} />
            </button>
          ))}
        </div>
        <select
          className={styles.sort}
          value={sort}
          aria-label={t(`sort.${sort}`)}
          onChange={(e) => {
            const v = e.target.value;
            if (SORTS.has(v)) onSort(v as StoreSort);
          }}
        >
          {STORE_SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`sort.${s}`)}
            </option>
          ))}
        </select>
      </div>
      {data.items.length === 0 ? (
        <div className={base.empty}>{t('empty')}</div>
      ) : (
        <div className={view === 'grid' ? styles.grid : styles.rows}>
          {data.items.map((s) =>
            view === 'grid' ? (
              <StoreGridCard key={s.id} s={s} onOpen={open} />
            ) : (
              <StoreRow key={s.id} s={s} onOpen={open} />
            ),
          )}
        </div>
      )}
      {data.total > STORE_PAGE_SIZE ? (
        <LocalizedPagination
          page={data.page}
          size={STORE_PAGE_SIZE}
          total={data.total}
          onChange={onPage}
          labels={{ unit: t('pager.unit') }}
        />
      ) : null}
    </div>
  );
}
