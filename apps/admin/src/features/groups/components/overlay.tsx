'use client';

import { useEffect, type ReactNode } from 'react';
import styles from './overlay.module.css';

/**
 * Hộp thoại giữa màn + ngăn kéo phải tự vẽ (không motion antd — đồng hồ parity dừng).
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

interface OverlayProps {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
}

/** Hộp thoại 640px (xuất danh sách) hoặc 420px (xác nhận) */
export function Dialog({
  open,
  title,
  closeLabel,
  onClose,
  footer,
  children,
  size = 'wide',
}: OverlayProps & { size?: 'wide' | 'small' }) {
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
        className={`${styles.dialog} ${size === 'small' ? styles.small : ''}`}
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

/** Ngăn kéo phải 600px của form Tạo / Sửa nhóm */
export function SideSheet({ open, title, closeLabel, onClose, footer, children }: OverlayProps) {
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
