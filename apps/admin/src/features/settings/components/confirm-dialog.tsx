'use client';

import { useEffect } from 'react';
import type { ConfirmRequest } from '../types';
import styles from './confirm-dialog.module.css';

/**
 * Hộp xác nhận 420px (D-32 thao tác phá huỷ, D-42 đổi quyền). Tự vẽ role=alertdialog thay
 * Modal.confirm của antd: không motion (parity dừng đồng hồ). Esc / bấm nền để huỷ.
 */
export function ConfirmDialog({
  req,
  onClose,
}: {
  req: ConfirmRequest | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!req) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [req, onClose]);

  if (!req) return null;
  return (
    <div className={styles.mask}>
      <button
        type="button"
        aria-label={req.cancelLabel}
        className={styles.backdrop}
        onClick={onClose}
      />
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="st-cf-title"
        aria-describedby="st-cf-body"
      >
        <div id="st-cf-title" className={styles.title}>
          {req.title}
        </div>
        <div id="st-cf-body" className={styles.body}>
          {req.body}
        </div>
        <div className={styles.foot}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            {req.cancelLabel}
          </button>
          <button
            type="button"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- hộp xác nhận: focus nút chính
            autoFocus
            className={`${styles.ok} ${req.danger ? styles.danger : ''}`}
            onClick={() => {
              onClose();
              req.onOk();
            }}
          >
            {req.okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
