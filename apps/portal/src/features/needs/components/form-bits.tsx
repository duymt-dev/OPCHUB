'use client';

import type { ReactNode } from 'react';
import styles from './form.module.css';

/** Tiêu đề mục đánh số (prototype: chấm tròn xanh + tên + gợi ý xám) */
export function Section(p: { n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.num}>{p.n}</span>
        <span className={styles.sectionTitle}>{p.title}</span>
        <span className={styles.sectionHint}>{p.hint}</span>
      </div>
      {p.children}
    </section>
  );
}

export function Label({ text, required }: { text: string; required?: boolean | undefined }) {
  return (
    <span>
      {required ? <span className={styles.req}>* </span> : null}
      {text}
    </span>
  );
}

/** Ô nhập 1 dòng có nhãn */
export function TextField(p: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean | undefined;
  placeholder?: string | undefined;
  type?: 'text' | 'date' | 'email' | 'tel' | 'url' | undefined;
  accent?: boolean | undefined;
}) {
  return (
    <label className={styles.field}>
      <Label text={p.label} required={p.required} />
      <input
        className={`${styles.input} ${p.accent ? styles.accent : ''}`}
        type={p.type ?? 'text'}
        value={p.value}
        placeholder={p.placeholder}
        onChange={(e) => p.onChange(e.target.value)}
      />
    </label>
  );
}

interface ChipsProps<T extends string> {
  label: string;
  required?: boolean | undefined;
  options: readonly { key: T; label: string }[];
  isOn: (k: T) => boolean;
  onPick: (k: T) => void;
  /** Chọn nhiều: chip đang chọn có dấu "✓ " như prototype */
  multi?: boolean | undefined;
}

/** Nhóm chip chọn 1 / chọn nhiều */
export function Chips<T extends string>(p: ChipsProps<T>) {
  return (
    <div className={styles.field} role="group" aria-label={p.label}>
      <Label text={p.label} required={p.required} />
      <div className={styles.chips}>
        {p.options.map((o) => {
          const on = p.isOn(o.key);
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              className={`${styles.chip} ${on ? styles.chipOn : ''}`}
              onClick={() => p.onPick(o.key)}
            >
              {p.multi && on ? '✓ ' : ''}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
