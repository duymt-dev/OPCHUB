'use client';

import { Input, Select } from 'antd';
import type { ReactNode } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  key: string;
  placeholder: string;
  options: FilterOption[];
  width?: number;
}

export interface FilterBarProps {
  search?: { value: string; placeholder: string; onChange: (v: string) => void };
  filters?: FilterField[];
  values?: Record<string, string | undefined>;
  onFilterChange?: (key: string, value: string | undefined) => void;
  extra?: ReactNode;
}

/** Thanh lọc danh sách: ô tìm + các select; giá trị nên đồng bộ với URL (useListParams) */
export function FilterBar({
  search,
  filters = [],
  values = {},
  onFilterChange,
  extra,
}: FilterBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {search ? (
        <Input.Search
          aria-label={search.placeholder}
          allowClear
          value={search.value}
          placeholder={search.placeholder}
          onChange={(e) => search.onChange(e.target.value)}
          style={{ width: 240, maxWidth: '100%' }}
        />
      ) : null}
      {filters.map((f) => (
        <Select
          key={f.key}
          allowClear
          placeholder={f.placeholder}
          options={f.options}
          value={values[f.key]}
          onChange={(v: string | undefined) => onFilterChange?.(f.key, v)}
          style={{ width: f.width ?? 180 }}
        />
      ))}
      {extra ? <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>{extra}</div> : null}
    </div>
  );
}
