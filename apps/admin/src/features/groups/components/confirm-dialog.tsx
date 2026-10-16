'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from './overlay';
import styles from './overlay.module.css';

export interface ConfirmRequest {
  title: string;
  body: string;
  okLabel: string;
  onOk: () => void;
}

/** D-32: thao tác nguy hiểm của admin luôn xác nhận (API ghi audit_logs) */
export function ConfirmDialog({
  req,
  busy,
  onClose,
}: {
  req: ConfirmRequest | null;
  busy: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('groups.confirm');
  return (
    <Dialog
      open={!!req}
      size="small"
      title={req?.title ?? ''}
      closeLabel={t('cancel')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.btn} onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={styles.danger}
            disabled={busy}
            onClick={() => req?.onOk()}
          >
            {req?.okLabel}
          </button>
        </>
      }
    >
      <p className={styles.confirmText}>{req?.body}</p>
    </Dialog>
  );
}
