'use client';

import { useLayoutEffect, type ReactNode } from 'react';
import styles from './sheet.module.css';

interface Props {
  title: string;
  closeLabel: string;
  cancelLabel: string;
  saveLabel: string;
  wide?: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
}

/** Drawer "Persona" (480px) / "Kịch bản hội thoại" (920px): Esc hoặc bấm nền để đóng */
export function Sheet(p: Props) {
  const { onClose } = p;
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        className={`${styles.sheet} ${p.wide ? styles.wide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={p.title}
      >
        <div className={styles.head}>
          <span className={styles.title}>{p.title}</span>
          <button type="button" className={styles.x} aria-label={p.closeLabel} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>{p.children}</div>
        <div className={styles.foot}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            {p.cancelLabel}
          </button>
          <button type="button" className={styles.save} disabled={p.saving} onClick={p.onSave}>
            {p.saveLabel}
          </button>
        </div>
      </div>
    </>
  );
}
