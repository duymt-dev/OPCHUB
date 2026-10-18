'use client';

import { useEffect, useRef, useState } from 'react';
import { useFieldA11y } from '../../form-errors/field-error';
import { Icon } from '../../icons';
import styles from './phone-field.module.css';

export interface PhoneCountry {
  id: string;
  name: string;
  dial: string;
  flagSrc: string;
}

interface PhoneFieldProps {
  countries: PhoneCountry[];
  country: string;
  number: string;
  placeholder: string;
  countryLabel: string;
  onCountry: (id: string) => void;
  onNumber: (v: string) => void;
}

/** SĐT có chọn mã quốc gia (A-16) */
export function PhoneField(p: PhoneFieldProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const cur = p.countries.find((c) => c.id === p.country) ?? p.countries[0];
  const a11y = useFieldA11y();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={root} className={styles.box} data-invalid-frame="">
      <button
        type="button"
        className={styles.cc}
        aria-label={p.countryLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        {cur ? <img className={styles.flag} src={cur.flagSrc} alt="" /> : null}
        <span className={styles.dial}>{cur?.dial}</span>
        <Icon name="chevronDown" size={12} stroke="rgba(0,0,0,0.45)" strokeWidth={2.4} />
      </button>
      <input
        {...a11y}
        type="tel"
        className={styles.input}
        value={p.number}
        placeholder={p.placeholder}
        onChange={(e) => p.onNumber(e.target.value)}
      />
      {open ? (
        <div className={styles.pop} role="listbox" aria-label={p.countryLabel}>
          {p.countries.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={c.id === cur?.id}
              className={styles.item}
              onClick={(e) => {
                e.preventDefault();
                p.onCountry(c.id);
                setOpen(false);
              }}
            >
              <img className={styles.flag} src={c.flagSrc} alt="" />
              <span className={styles.name}>{c.name}</span>
              <span className={styles.code}>{c.dial}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
