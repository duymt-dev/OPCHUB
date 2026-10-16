'use client';

import type { ReactNode } from 'react';
import styles from './tabs.module.css';
import { useRovingFocus } from './use-roving-focus';

export interface TabItem<K extends string = string> {
  key: K;
  label: ReactNode;
  /** Số đếm cạnh nhãn; ẩn khi undefined (variant admin ẩn cả khi 0) */
  count?: number;
}

/**
 * - `page`: tab trang (hồ sơ, dự án) gap 28px
 * - `scope`: như page nhưng chữ 15px, số đếm pill xám
 * - `admin`: tab trong màn quản trị, đệm 10/14, số đếm pill đỏ
 */
export type TabsVariant = 'page' | 'scope' | 'admin';

export interface TabsProps<K extends string = string> {
  items: TabItem<K>[];
  activeKey: K;
  onChange: (key: K) => void;
  variant?: TabsVariant;
  ariaLabel: string;
  /** id của panel tương ứng: `${idPrefix}-panel-${key}` */
  idPrefix?: string;
}

/** Thanh tab gạch chân như prototype; điều hướng bằng phím mũi tên */
export function Tabs<K extends string = string>({
  items,
  activeKey,
  onChange,
  variant = 'page',
  ariaLabel,
  idPrefix,
}: TabsProps<K>) {
  const { setRef, onKeyDown } = useRovingFocus(items.length, (i) => {
    const item = items[i];
    if (item) onChange(item.key);
  });

  return (
    <div role="tablist" aria-label={ariaLabel} className={`${styles.bar} ${styles[variant] ?? ''}`}>
      {items.map((item, i) => {
        const active = item.key === activeKey;
        const showCount = item.count !== undefined && (variant !== 'admin' || item.count > 0);
        return (
          <button
            key={item.key}
            ref={setRef(i)}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${item.key}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${item.key}` : undefined}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`${styles.tab} ${active ? styles.active : ''}`}
            onClick={() => onChange(item.key)}
            onKeyDown={onKeyDown}
          >
            {item.label}
            {showCount ? <span className={styles.count}>{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
