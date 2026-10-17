'use client';

import type { MailLogRow } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { vnDateTime } from '../model';
import styles from './tables.module.css';

interface Props {
  items: MailLogRow[];
  onView: (r: MailLogRow) => void;
  onResend: (r: MailLogRow) => void;
}

/** D-78 tab "Nhật ký gửi": email chào mừng / chiến dịch đã gửi, "Xem" và "Gửi lại" */
export function MailLog({ items, onView, onResend }: Props) {
  const t = useTranslations('marketing.log');
  if (items.length === 0) return <div className={styles.sub}>{t('empty')}</div>;
  return (
    <ul className={styles.log} aria-label={t('label')}>
      {items.map((x) => (
        <li key={x.id} className={styles.logRow}>
          <span className={`${styles.tag} ${styles.blue}`}>{t(x.kind)}</span>
          <div className={styles.logMain}>
            <b>
              {x.name} · <span className={styles.logTo}>{x.to}</span>
            </b>
            <span className={styles.sub}>{x.subject}</span>
          </div>
          <span className={styles.when}>{vnDateTime(x.sentAt)}</span>
          <span className={styles.ok}>{t('sent')}</span>
          <button type="button" className={styles.link} onClick={() => onView(x)}>
            {t('view')}
          </button>
          <button type="button" className={styles.link} onClick={() => onResend(x)}>
            {t('resend')}
          </button>
        </li>
      ))}
    </ul>
  );
}
