'use client';

import type { ServiceRequest } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import styles from './request-done.module.css';

/** P-83: phiếu tư vấn đã gửi */
export function RequestDone({ r, onBack }: { r: ServiceRequest; onBack: () => void }) {
  const t = useTranslations('services');
  return (
    <div className={styles.done}>
      <div className={styles.check} aria-hidden="true">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <div className={styles.text}>
        <span className={styles.title}>{t('done.title')}</span>
        <span className={styles.lead}>{t('done.lead', { phone: r.phone, email: r.email })}</span>
      </div>
      <div className={styles.table}>
        <span className={styles.k}>{t('done.code')}</span>
        <b className={styles.v}>{r.code}</b>
        <span className={styles.k}>{t('done.service')}</span>
        <span className={styles.v}>{r.serviceName}</span>
        <span className={styles.k}>{t('done.status')}</span>
        <span className={styles.v}>{t('done.sent')}</span>
      </div>
      <button type="button" className={styles.back} onClick={onBack}>
        {t('done.back')}
      </button>
    </div>
  );
}
