'use client';

import type { ReactNode } from 'react';
import styles from './bulk-bar.module.css';

export interface BulkBarProps {
  count: number;
  /** Đơn vị sau số, vd "thành viên"; mặc định "mục" */
  unit?: string;
  /** Các nút thao tác hàng loạt (Button của antd) */
  actions?: ReactNode;
  onClear?: () => void;
  selectedLabel?: string;
  clearLabel?: string;
  ariaLabel?: string;
}

/** Thanh "Đã chọn N mục" + thao tác hàng loạt; ẩn khi chưa chọn gì */
export function BulkBar({
  count,
  unit = 'mục',
  actions,
  onClear,
  selectedLabel = 'Đã chọn',
  clearLabel = 'Bỏ chọn',
  ariaLabel = 'Thao tác hàng loạt',
}: BulkBarProps) {
  if (count <= 0) return null;
  return (
    <section className={styles.bar} aria-label={ariaLabel}>
      <span className={styles.text} aria-live="polite">
        {selectedLabel} <b className={styles.count}>{count}</b> {unit}
      </span>
      <div className={styles.actions}>
        {actions}
        {onClear ? (
          <button type="button" className={styles.clear} onClick={onClear}>
            {clearLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
