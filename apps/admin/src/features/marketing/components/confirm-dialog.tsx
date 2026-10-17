'use client';

import { useTranslations } from 'next-intl';
import { useEscape } from '../hooks/use-escape';
import type { ConfirmRequest } from '../types';
import styles from './overlay.module.css';

/**
 * Hộp xác nhận 420px cho "Gửi ngay" / "Xóa" (không hoàn tác, luật 10). Tự vẽ role=alertdialog,
 * không motion antd (đồng hồ parity dừng).
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
  const t = useTranslations('marketing.confirm');
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
        aria-labelledby="mk-cf-title"
        aria-describedby="mk-cf-body"
      >
        <div id="mk-cf-title" className={styles.confirmTitle}>
          {req.title}
        </div>
        <div id="mk-cf-body" className={styles.confirmBody}>
          {req.body}
        </div>
        <div className={styles.confirmFoot}>
          <button type="button" className={styles.btn} onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={req.danger ? styles.danger : styles.primary}
            disabled={busy}
            onClick={req.onOk}
          >
            {req.okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
