'use client';

import type { FundraisingPayment } from '@opchub/shared/api-domains';
import { PayQr, qrCaption, qrVnd } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import styles from './fundraising.module.css';

const QrIcon = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
  </svg>
);

/**
 * Cột "2. Chuyển khoản" (prototype v4.2 `fg`): chưa chọn dự án → khung gợi ý; có khoản → QR VietQR
 * động (D-96) + bảng ngân hàng / số tiền / nội dung (Sao chép) + dòng "Cấu trúc" (§28.1).
 */
export function FundraisingPay({
  pay,
  amountText,
  error,
  onCopy,
}: {
  pay: FundraisingPayment | null;
  amountText: string;
  error: string | null;
  onCopy: (text: string) => void;
}) {
  const t = useTranslations('projects.fundPlan');
  return (
    <div className={styles.col}>
      <span className={styles.step}>{t('stepPay')}</span>
      {error ? <span className={styles.error}>{error}</span> : null}
      {!pay ? (
        <div className={styles.empty}>
          <QrIcon />
          {t.rich('noSel', { br: () => <br /> })}
        </div>
      ) : (
        <>
          <div className={styles.qrBox}>
            <PayQr
              value={pay.qr}
              size={200}
              label={t('qrAlt', { code: pay.code ?? '' })}
              loadingText={t('qrLoading')}
              caption={qrCaption(pay.bank, t('qrAmount', { amount: qrVnd(pay.amount) }))}
            />
            <div className={styles.qrText}>
              <span className={styles.vietqr}>VietQR</span>
              {t('qrScan')}
            </div>
          </div>
          <div className={styles.grid}>
            <span className={styles.k}>{t('bank')}</span>
            <span className={styles.v}>{pay.bank.bankName}</span>
            <span />
            <span className={styles.k}>{t('accountNo')}</span>
            <b className={styles.v}>{pay.bank.accountNo}</b>
            <span />
            <span className={styles.k}>{t('accountName')}</span>
            <span className={styles.v}>{pay.bank.accountName}</span>
            <span />
            <span className={styles.k}>{t('amount')}</span>
            <b className={styles.amount}>{amountText}</b>
            <span />
            <span className={styles.k}>{t('content')}</span>
            <b className={styles.code}>{pay.transferContent}</b>
            <button
              type="button"
              className={styles.copy}
              onClick={() => onCopy(pay.transferContent)}
            >
              {t('copy')}
            </button>
          </div>
          {/* §28.1 (D-105): cấu trúc nội dung CK; một dự án / khoản (D-94 4B) */}
          <span className={styles.structure}>{t.rich('structure', { b: (c) => <b>{c}</b> })}</span>
        </>
      )}
    </div>
  );
}
