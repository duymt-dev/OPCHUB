'use client';

import type { MyMembership } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useTransferConfirm } from '../hooks/use-membership';
import { planOf } from '@opchub/shared';
import { useAuthStore } from '@/lib/auth-store';
import { formatVnd } from '../model';
import { PayDetails } from './pay-details';
import styles from './pay-modal.module.css';

interface Props {
  m: MyMembership;
  onBack: () => void;
  onDone: () => void;
}

const BackIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

/** P-84 → P-86: hộp chuyển khoản; "Tôi đã chuyển khoản" → chờ đối soát (D-31) */
export function PayModal({ m, onBack, onDone }: Props) {
  const t = useTranslations('membership.pay');
  const tp = useTranslations('membership.plans');
  const { waiting, confirm } = useTransferConfirm(onDone);
  const plan = planOf(useAuthStore((s) => s.me?.accountType ?? 'personal')) ?? 'personal';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onBack();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onBack]);

  return (
    <>
      <div className={styles.mask} onClick={onBack} aria-hidden="true" />
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="pay-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span id="pay-title" className={styles.title}>
              {t('title', {
                name: tp(`${plan}.name`),
                amount: formatVnd(m.amount),
                month: formatVnd(Math.round(m.amount / 12)),
              })}
            </span>
            <span className={styles.sub}>{t('sub')}</span>
          </div>
          <button type="button" className={styles.close} aria-label={t('close')} onClick={onBack}>
            ×
          </button>
        </div>
        <PayDetails m={m} />
        <div className={styles.foot}>
          {waiting ? (
            <span className={styles.waiting} role="status">
              <span className={styles.pulse} />
              {t('waiting')}
            </span>
          ) : null}
          <button type="button" className={styles.back} onClick={onBack}>
            <BackIcon />
            {t('back')}
          </button>
          {waiting ? null : (
            <button type="button" className={styles.confirm} onClick={confirm}>
              {t('confirm')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
