'use client';

import { useEffect } from 'react';
import styles from './confirm-dialog.module.css';

export interface ConfirmRequest {
  title: string;
  body: string;
  okLabel: string;
  cancelLabel: string;
  onOk: () => void;
}

/**
 * Hộp xác nhận 420px cho thao tác phá huỷ (D-32: từ chối phiếu YC, xoá dịch vụ). Tự vẽ
 * role=alertdialog thay Modal.confirm của antd: không motion (parity dừng đồng hồ).
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
        aria-labelledby="rq-cf-title"
        aria-describedby="rq-cf-body"
      >
        <div id="rq-cf-title" className={styles.title}>
          {req.title}
        </div>
        <div id="rq-cf-body" className={styles.body}>
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
            className={styles.ok}
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
