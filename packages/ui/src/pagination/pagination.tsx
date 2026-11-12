'use client';

import styles from './pagination.module.css';
import { clampPage, pageNumbers } from './page-numbers';

export interface PaginationLabels {
  /** Optional presentation only. Page identifiers and onChange always remain numbers. */
  number?: (n: number) => string;
  /** Đơn vị sau tổng, vd "thành viên", "nhóm" */
  unit: string;
  prev: string;
  next: string;
  page: (n: number) => string;
  pageSize: string;
  perPage: (n: number) => string;
  range: (from: number, to: number, total: number, unit: string) => string;
}

export const DEFAULT_PAGINATION_LABELS: PaginationLabels = {
  unit: 'mục',
  prev: 'Trang trước',
  next: 'Trang sau',
  page: (n) => `Trang ${n}`,
  pageSize: 'Số dòng mỗi trang',
  perPage: (n) => `${n} / trang`,
  range: (from, to, total, unit) => `Hiển thị ${from}–${to} / ${total} ${unit}`,
};

export interface PaginationProps {
  page: number;
  size: number;
  total: number;
  onChange: (page: number) => void;
  /** Đổi cỡ trang luôn quay về trang 1 như prototype */
  onSizeChange?: (size: number) => void;
  sizeOptions?: number[];
  labels?: Partial<PaginationLabels>;
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Bộ phân trang của prototype: "Hiển thị a–b / N", ‹ 1 … 4 5 6 … 12 ›, "N / trang" */
export function Pagination({
  page: rawPage,
  size,
  total,
  onChange,
  onSizeChange,
  sizeOptions = [10, 20, 50],
  labels: custom,
}: PaginationProps) {
  if (total <= 0) return null;
  const labels = { ...DEFAULT_PAGINATION_LABELS, ...custom };
  const { page, pages } = clampPage(rawPage, total, size);
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  const go = (p: number) => {
    if (p >= 1 && p <= pages && p !== page) onChange(p);
  };

  return (
    <nav className={styles.pager} aria-label={labels.range(from, to, total, labels.unit)}>
      <span className={styles.info}>{labels.range(from, to, total, labels.unit)}</span>
      <button
        type="button"
        className={styles.nav}
        aria-label={labels.prev}
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        <Chevron dir="left" />
      </button>
      {pageNumbers(page, pages).map((n, i) =>
        n === 'ellipsis' ? (
          <span key={`e${i}`} className={styles.ellipsis} aria-hidden>
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            className={`${styles.num} ${n === page ? styles.current : ''}`}
            aria-label={labels.page(n)}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => go(n)}
          >
            {labels.number ? labels.number(n) : n}
          </button>
        ),
      )}
      <button
        type="button"
        className={styles.nav}
        aria-label={labels.next}
        disabled={page >= pages}
        onClick={() => go(page + 1)}
      >
        <Chevron dir="right" />
      </button>
      {onSizeChange ? (
        <select
          className={styles.size}
          aria-label={labels.pageSize}
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
        >
          {(sizeOptions.includes(size) ? sizeOptions : [...sizeOptions, size])
            .sort((a, b) => a - b)
            .map((n) => (
              <option key={n} value={n}>
                {labels.perPage(n)}
              </option>
            ))}
        </select>
      ) : null}
    </nav>
  );
}
