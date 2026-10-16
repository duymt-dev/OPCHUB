'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { REPORT_REASONS, type MessageView, type ReportReason } from '../types';
import styles from './report-modal.module.css';

interface Props {
  target: MessageView | null;
  onClose: () => void;
  onSubmit: (reason: ReportReason, note: string) => Promise<void>;
}

/**
 * "Báo cáo tin nhắn": chọn lý do (bắt buộc) + mô tả thêm; gửi ẩn danh (D-43).
 * Hộp tự vẽ role=dialog thay antd Modal: không có animation mở (đứng yên khi parity dừng giờ).
 */
export function ReportModal({ target, onClose, onSubmit }: Props) {
  const t = useTranslations('chat.report');
  const toast = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');

  const close = () => {
    setReason(null);
    setNote('');
    onClose();
  };
  const submit = () => {
    if (!reason) return toast(t('needReason'));
    void onSubmit(reason, note.trim()).then(close, () => undefined);
  };

  useEffect(() => {
    if (!target) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target) return null;
  const msg = target.msg;
  return (
    <div className={styles.mask}>
      <button type="button" aria-label={t('cancel')} className={styles.backdrop} onClick={close} />
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="rpt-title">
        <div className={styles.head}>
          <span id="rpt-title" className={styles.title}>
            {t('title')}
          </span>
          <button type="button" aria-label={t('cancel')} className={styles.x} onClick={close}>
            ×
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.quote}>
            <b>{msg.sender.name}:</b> {msg.body || msg.attachment?.name}
          </div>
          <div className={styles.label}>{t('reason')}</div>
          <div className={styles.reasons} role="radiogroup" aria-label={t('reason')}>
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                className={styles.reason}
                onClick={() => setReason(r)}
              >
                <i className={styles.radio}>
                  <i />
                </i>
                <span>{t(r)}</span>
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            className={styles.note}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('notePh')}
            aria-label={t('notePh')}
          />
          <span className={styles.hint}>{t('hint')}</span>
        </div>
        <div className={styles.foot}>
          <button type="button" className={styles.cancel} onClick={close}>
            {t('cancel')}
          </button>
          <button type="button" className={styles.submit} onClick={submit}>
            {t('submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
