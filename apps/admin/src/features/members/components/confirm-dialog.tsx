'use client';

import { useEscape } from '../hooks/use-escape';
import styles from './confirm-dialog.module.css';

export interface ConfirmRequest {
  title: string;
  body: string;
  okLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onOk: () => void;
}

/**
 * Hộp xác nhận 420px cho thao tác nhạy cảm (D-32, D-42). Tự vẽ role=alertdialog thay
 * Modal.confirm của antd: không motion (parity dừng đồng hồ).
 */
export function ConfirmDialog({
  req,
  onClose,
}: {
  req: ConfirmRequest | null;
  onClose: () => void;
}) {
  useEscape(req !== null, onClose);

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
        aria-labelledby="cf-title"
        aria-describedby="cf-body"
      >
        <div id="cf-title" className={styles.title}>
          {req.title}
        </div>
        <div id="cf-body" className={styles.body}>
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
