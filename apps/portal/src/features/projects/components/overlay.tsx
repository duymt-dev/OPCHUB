'use client';

import { useEffect, type ReactNode } from 'react';
import styles from './overlay.module.css';

/**
 * Hộp thoại giữa màn + ngăn kéo phải tự vẽ (không dùng motion antd — đồng hồ parity dừng).
 * Esc hoặc bấm nền để đóng; `role=dialog` + `aria-modal`.
 */

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

interface DialogProps {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
  width?: 460 | 480;
}

export function Dialog({
  open,
  title,
  closeLabel,
  onClose,
  footer,
  children,
  width = 460,
}: DialogProps) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <div className={styles.mask}>
      <button
        type="button"
        className={styles.backdrop}
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className={`${styles.dialog} ${width === 480 ? styles.wide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.head}>
          <span className={styles.title}>{title}</span>
          <button type="button" className={styles.x} aria-label={closeLabel} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        <div className={styles.foot}>{footer}</div>
      </div>
    </div>
  );
}

interface SheetProps {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
}

/** Ngăn kéo 620px của form đăng dự án */
export function SideSheet({ open, title, closeLabel, onClose, footer, children }: SheetProps) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <>
      <button
        type="button"
        className={styles.sheetMask}
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.sheetHead}>
          <button type="button" className={styles.sheetX} aria-label={closeLabel} onClick={onClose}>
            ×
          </button>
          <span className={styles.title}>{title}</span>
        </div>
        <div className={styles.sheetBody}>{children}</div>
        <div className={styles.foot}>{footer}</div>
      </div>
    </>
  );
}
