'use client';

import type { FeeRow, UnmatchedTxn } from '@opchub/shared/api-domains';
import { Modal } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useMatchTransaction } from '../hooks/use-fee-transactions';
import { useHintMember } from '../hooks/use-member-lookup';
import { vnd } from '../model';
import styles from './fee-transactions.module.css';
import { MemberPicker } from './member-picker';

const REASON_MAX = 500;

interface Props {
  txn: UnmatchedTxn;
  onClose: () => void;
}

/**
 * Hộp Khớp tay (BUG-014, QĐ-01): chọn thành viên (điền sẵn nếu `matchedHint` khớp đúng 1 người),
 * lý do bắt buộc ≤ 500 ký tự, bước xác nhận "Khớp giao dịch … cho …?" rồi mới gửi.
 */
export function MatchDialog({ txn, onClose }: Props) {
  const t = useTranslations('fees.txn.dialog');
  const hint = useHintMember(txn.matchedHint);
  const [picked, setPicked] = useState<FeeRow | null>(null);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const match = useMatchTransaction(onClose);
  const member = picked ?? hint.data ?? null;
  const trimmed = reason.trim();
  const valid = !!member && trimmed.length > 0 && trimmed.length <= REASON_MAX;

  const submit = () => {
    if (member) match.mutate({ txn, member, reason: trimmed });
  };

  return (
    <Modal open title={t('title')} onClose={onClose} closeLabel={t('cancel')}>
      <div className={styles.stack}>
        <p className={styles.summary}>
          {t('txn', { amount: vnd(txn.amount) })}
          <br />
          <span className={styles.muted}>{txn.content}</span>
        </p>
        {confirming && member ? (
          <p role="alert">{t('confirm', { amount: vnd(txn.amount), name: member.fullName })}</p>
        ) : (
          <>
            <MemberPicker selected={member} onSelect={setPicked} />
            <label className={styles.field}>
              {t('reason')}
              <textarea
                className={styles.textarea}
                value={reason}
                maxLength={REASON_MAX}
                placeholder={t('reasonPlaceholder')}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </>
        )}
        <div className={styles.foot}>
          <button
            type="button"
            className={styles.cancel}
            onClick={confirming ? () => setConfirming(false) : onClose}
          >
            {confirming ? t('back') : t('cancel')}
          </button>
          <button
            type="button"
            className={styles.ok}
            disabled={!valid || match.isPending}
            onClick={confirming ? submit : () => setConfirming(true)}
          >
            {confirming ? t('submit') : t('next')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
