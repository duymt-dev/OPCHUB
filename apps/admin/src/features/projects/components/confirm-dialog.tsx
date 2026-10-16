'use client';

import { useTranslations } from 'next-intl';
import { useEscape } from '../hooks/use-escape';
import styles from './overlay.module.css';

export interface ConfirmRequest {
  title: string;
  body: string;
  okLabel: string;
  onOk: () => void;
}

/**
 * Hộp xác nhận 420px cho xoá / ẩn / từ chối dự án (luật 10). Tự vẽ role=alertdialog,
 * không motion antd (parity dừng đồng hồ); nằm trên drawer duyệt.
 */
export function ConfirmDialog({
  req,
  busy,
  onClose,
}: {
  req: ConfirmRequest | null;
  busy: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('projects.confirm');
  useEscape(req !== null, onClose);
  if (!req) return null;
  return (
    <div className={styles.confirmMask}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={styles.backdrop}
        onClick={onClose}
      />
      <div
        className={styles.confirm}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pj-cf-title"
        aria-describedby="pj-cf-body"
      >
        <div id="pj-cf-title" className={styles.confirmTitle}>
          {req.title}
        </div>
        <div id="pj-cf-body" className={styles.confirmBody}>
          {req.body}
        </div>
        <div className={styles.confirmFoot}>
          <button type="button" className={styles.btn} onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className={styles.danger} disabled={busy} onClick={req.onOk}>
            {req.okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
