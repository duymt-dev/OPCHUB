'use client';

import type { ReactNode } from 'react';
import { useRovingFocus } from '../tabs/use-roving-focus';
import styles from './filter-chips.module.css';

export interface FilterChip<K extends string = string> {
  key: K;
  label: ReactNode;
  count?: number;
  /** Chấm màu danh mục (8px), lấy từ dữ liệu danh mục */
  dotColor?: string;
}

interface BaseProps<K extends string> {
  items: FilterChip<K>[];
  ariaLabel: string;
  /** Nhãn chữ in hoa bên trái, vd "LĨNH VỰC" */
  heading?: ReactNode;
  size?: 'default' | 'small';
}

export interface SingleFilterChipsProps<K extends string> extends BaseProps<K> {
  multiple?: false;
  value: K;
  onChange: (key: K) => void;
}

export interface MultiFilterChipsProps<K extends string> extends BaseProps<K> {
  multiple: true;
  value: K[];
  onChange: (keys: K[]) => void;
}

export type FilterChipsProps<K extends string = string> =
  SingleFilterChipsProps<K> | MultiFilterChipsProps<K>;

const isActive = <K extends string>(props: FilterChipsProps<K>, key: K) =>
  props.multiple ? props.value.includes(key) : props.value === key;

function toggle<K extends string>(props: FilterChipsProps<K>, key: K) {
  if (props.multiple) {
    const next = props.value.includes(key)
      ? props.value.filter((k) => k !== key)
      : [...props.value, key];
    props.onChange(next);
  } else {
    props.onChange(key);
  }
}

function chipClass(active: boolean, muted: boolean, small: boolean) {
  return [
    styles.chip,
    small ? styles.small : '',
    active ? styles.active : '',
    muted ? styles.muted : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Nhóm chip lọc dạng viên thuốc có số đếm (pjCats, cmFilters của prototype) */
export function FilterChips<K extends string = string>(props: FilterChipsProps<K>) {
  const { items, ariaLabel, heading, size = 'default' } = props;
  const single = !props.multiple;
  const { setRef, onKeyDown } = useRovingFocus(items.length, (i) => {
    const item = items[i];
    if (item && single) toggle(props, item.key);
  });
  const focusIndex = Math.max(
    0,
    items.findIndex((it) => isActive(props, it.key)),
  );

  return (
    <div className={styles.wrap}>
      {heading ? <span className={styles.heading}>{heading}</span> : null}
      <div
        role={single ? 'radiogroup' : 'group'}
        aria-label={ariaLabel}
        className={styles.group}
        onKeyDown={onKeyDown}
      >
        {items.map((item, i) => {
          const active = isActive(props, item.key);
          return (
            <button
              key={item.key}
              ref={setRef(i)}
              type="button"
              role={single ? 'radio' : undefined}
              aria-checked={single ? active : undefined}
              aria-pressed={single ? undefined : active}
              tabIndex={single && i !== focusIndex ? -1 : 0}
              className={chipClass(active, !active && item.count === 0, size === 'small')}
              onClick={() => toggle(props, item.key)}
            >
              {item.dotColor ? (
                // Màu chấm là dữ liệu danh mục (động), không phải token giao diện
                <i className={styles.dot} style={{ background: item.dotColor }} aria-hidden />
              ) : null}
              {item.label}
              {item.count !== undefined ? <span className={styles.count}>{item.count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
