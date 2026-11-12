'use client';

import type { FeeRow, PendingFundraising, UnmatchedTxn } from '@opchub/shared/api-domains';
import { Modal } from '@opchub/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useMatchTransaction } from '../hooks/use-fee-transactions';
import { useHintMember } from '../hooks/use-member-lookup';
import { vnd } from '../model';
import styles from './fee-transactions.module.css';
import { FundraisingPicker } from './fundraising-picker';
import { MemberPicker } from './member-picker';

const REASON_MAX = 500;

type Mode = 'fee' | 'fundraising';

interface Props {
  txn: UnmatchedTxn;
  onClose: () => void;
}

/**
 * Hộp Khớp tay (BUG-014, QĐ-01): khớp vào phí thành viên (điền sẵn nếu `matchedHint` khớp đúng 1 người)
 * hoặc — D-113 (F3) — vào khoản Gói Gọi vốn chờ thanh toán (mặc định khi nội dung có mã GV).
 * Lý do bắt buộc ≤ 500 ký tự, bước xác nhận "Khớp giao dịch … cho …?" rồi mới gửi.
 */
export function MatchDialog({ txn, onClose }: Props) {
  const locale = useLocale();
  const t = useTranslations('fees.txn.dialog');
  const [mode, setMode] = useState<Mode>(txn.fundraisingHint ? 'fundraising' : 'fee');
  const hint = useHintMember(mode === 'fee' ? txn.matchedHint : null);
  const [picked, setPicked] = useState<FeeRow | null>(null);
  const [fund, setFund] = useState<PendingFundraising | null>(null);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const match = useMatchTransaction(onClose);
  const member = picked ?? hint.data ?? null;
  const target = mode === 'fee' ? member?.fullName : fund && `${fund.code} · ${fund.projectName}`;
  const trimmed = reason.trim();
  const valid = !!target && trimmed.length > 0 && trimmed.length <= REASON_MAX;

  const submit = () => {
    if (mode === 'fundraising' && fund) {
      match.mutate({ kind: 'fundraising', txn, fundraising: fund, reason: trimmed });
    } else if (member) {
      match.mutate({ kind: 'fee', txn, member, reason: trimmed });
    }
  };

  return (
    <Modal open title={t('title')} onClose={onClose} closeLabel={t('cancel')}>
      <div className={styles.stack}>
        <p className={styles.summary}>
          {t('txn', { amount: vnd(txn.amount, locale) })}
          <br />
          <span className={styles.muted}>{txn.content}</span>
        </p>
        {confirming && target ? (
          <p role="alert">{t('confirm', { amount: vnd(txn.amount, locale), name: target })}</p>
        ) : (
          <>
            <ModePicker value={mode} onChange={setMode} />
            {mode === 'fee' ? (
              <MemberPicker selected={member} onSelect={setPicked} />
            ) : (
              <FundraisingPicker hint={txn.fundraisingHint} selected={fund} onSelect={setFund} />
            )}
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

/** D-113 (F3): khớp vào phí thành viên hay khoản Gói Gọi vốn */
function ModePicker({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const t = useTranslations('fees.txn.dialog');
  return (
    <div className={styles.modes} role="radiogroup" aria-label={t('mode')}>
      {(['fee', 'fundraising'] as const).map((m) => (
        <label key={m} className={styles.mode}>
          <input
            type="radio"
            name="match-mode"
            checked={value === m}
            onChange={() => onChange(m)}
          />
          {t(m === 'fee' ? 'modeFee' : 'modeFundraising')}
        </label>
      ))}
    </div>
  );
}
