'use client';

import { useEffect, useId } from 'react';
import styles from './confirm-dialog.module.css';

/** Yêu cầu mở hộp xác nhận cho thao tác nhạy cảm / phá huỷ (D-32, D-42, luật 10) */
export interface ConfirmRequest {
  title: string;
  body: string;
  okLabel: string;
  cancelLabel: string;
  /** Nút chính đỏ (xoá, khoá, từ chối); mặc định xanh */
  danger?: boolean;
  onOk: () => void;
}

export interface ConfirmDialogProps {
  req: ConfirmRequest | null;
  /**
   * Có truyền → hộp giữ nguyên tới khi caller đóng (chờ API), `true` khoá nút chính.
   * Không truyền → bấm nút chính đóng hộp ngay rồi chạy `onOk`.
   */
  busy?: boolean;
  onClose: () => void;
}

/**
 * Hộp xác nhận 420px dùng chung (BUG-044, TD-030). Tự vẽ `role=alertdialog` thay Modal.confirm
 * của antd: không motion (parity dừng đồng hồ). Esc / bấm nền để huỷ.
 */
export function ConfirmDialog({ req, busy, onClose }: ConfirmDialogProps) {
  const id = useId();
  const open = req !== null;
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!req) return null;
  const managed = busy !== undefined;
  return (
    <div className={styles.mask}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={styles.backdrop}
        onClick={onClose}
      />
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        aria-describedby={`${id}-b`}
      >
        <div id={`${id}-t`} className={styles.title}>
          {req.title}
        </div>
        <div id={`${id}-b`} className={styles.body}>
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
            disabled={busy === true}
            onClick={() => {
              if (!managed) onClose();
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
