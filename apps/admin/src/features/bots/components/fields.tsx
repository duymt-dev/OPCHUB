'use client';

import type { ReactNode } from 'react';
import { toggleId } from '../model';
import type { GroupRef } from '../types';
import f from './form.module.css';

interface TextProps {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'datetime-local';
  min?: number;
  max?: number;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  max,
}: TextProps) {
  return (
    <label className={f.field}>
      {label}
      <input
        className={f.input}
        type={type}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

interface SelectProps {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

export function SelectField({ label, value, onChange, options }: SelectProps) {
  return (
    <label className={f.field}>
      {label}
      <select className={f.select} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Chip chọn nhiều nhóm (aria-pressed) */
export function GroupChips({
  groups,
  value,
  onChange,
}: {
  groups: GroupRef[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className={f.chips}>
      {groups.map((g) => (
        <button
          key={g.id}
          type="button"
          className={f.chip}
          aria-pressed={value.includes(g.id)}
          onClick={() => onChange(toggleId(value, g.id))}
        >
          {g.name}
        </button>
      ))}
    </div>
  );
}

export const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));
