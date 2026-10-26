'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import styles from './language-menu.module.css';

export interface LanguageOption {
  code: string;
  country: string;
  native: string;
  flagSrc: string;
}

export interface LanguageMenuProps {
  title: string;
  current: string;
  options: LanguageOption[];
  onSelect: (code: string) => void;
  /** `topbar`: nút viền + quả địa cầu như thanh trên cùng prototype v4; mặc định cờ (màn đăng nhập) */
  variant?: 'auth' | 'topbar';
}

/** Nút ngôn ngữ + bảng "CHỌN QUỐC GIA & NGÔN NGỮ" (A-06) */
export function LanguageMenu({
  title,
  current,
  options,
  onSelect,
  variant = 'auth',
}: LanguageMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.code === current) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={root} className={styles.root}>
      <button
        type="button"
        className={variant === 'topbar' ? `${styles.trigger} ${styles.topbar}` : styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Màn đăng nhập: cờ của ngôn ngữ đang chọn; thanh trên cùng (v4) và khi chưa chọn: quả địa cầu */}
        {active && variant === 'auth' ? (
          <img className={styles.triggerFlag} src={active.flagSrc} alt="" />
        ) : (
          <Icon name="globe" size={18} />
        )}
        {active?.native}
        <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
      </button>
      {open ? (
        <div className={styles.pop}>
          <div className={styles.title}>{title}</div>
          <div className={styles.grid} role="listbox" aria-label={title}>
            {options.map((o) => (
              <button
                key={o.code}
                type="button"
                role="option"
                aria-selected={o.code === current}
                className={styles.item}
                onClick={() => {
                  setOpen(false);
                  onSelect(o.code);
                }}
              >
                <img className={styles.flag} src={o.flagSrc} alt="" />
                <span className={styles.text}>
                  <span className={styles.country}>{o.country}</span>
                  <span className={styles.native}>{o.native}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
