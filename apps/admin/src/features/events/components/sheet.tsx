'use client';

import { useEffect, type ReactNode } from 'react';
import styles from './sheet.module.css';

interface SheetProps {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  /** 440px (danh sách đăng ký) hoặc 600px (form) */
  width: 'narrow' | 'wide';
  /** Nút bên phải tiêu đề (VD "Xuất CSV") */
  extra?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Ngăn kéo phải tự vẽ (không motion antd — đồng hồ parity dừng).
 * Esc hoặc bấm nền để đóng; `role=dialog` + `aria-modal`.
 */
export function Sheet({
  open,
  title,
  closeLabel,
  onClose,
  width,
  extra,
  footer,
  children,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <button
        type="button"
        className={styles.mask}
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className={`${styles.sheet} ${width === 'wide' ? styles.wide : styles.narrow}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.head}>
          <button type="button" className={styles.x} aria-label={closeLabel} onClick={onClose}>
            ×
          </button>
          <span className={styles.title}>{title}</span>
          {extra}
        </div>
        {children}
        {footer ? <div className={styles.foot}>{footer}</div> : null}
      </div>
    </>
  );
}
