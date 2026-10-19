'use client';

import { canResendMail, type MailLogRow } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { MAIL_STATUS_TONE, vnDateTime } from '../model';
import styles from './tables.module.css';

interface Props {
  items: MailLogRow[];
  onView: (r: MailLogRow) => void;
  onResend: (r: MailLogRow) => void;
}

/**
 * D-78 tab "Nhật ký gửi" (NA-05): mọi loại thư, trạng thái Đang chờ / Đã gửi / Lỗi / Đã huỷ, số lần
 * thử + lỗi gần nhất. "Xem" cho chào mừng / chiến dịch; "Gửi lại" cho thư đã gửi (chào mừng /
 * chiến dịch) và thư lỗi (trừ OTP / đặt lại mật khẩu).
 */
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
            {x.status === 'failed' && x.error ? (
              <span className={styles.err}>{t('lastError', { error: x.error })}</span>
            ) : null}
          </div>
          <span className={styles.when}>{vnDateTime(x.sentAt)}</span>
          {x.attempts > 0 ? (
            <span className={styles.when}>{t('attempts', { n: x.attempts })}</span>
          ) : null}
          <span className={styles[MAIL_STATUS_TONE[x.status]]}>{t(`st.${x.status}`)}</span>
          {x.kind === 'welcome' || x.kind === 'campaign' ? (
            <button type="button" className={styles.link} onClick={() => onView(x)}>
              {t('view')}
            </button>
          ) : null}
          {canResendMail(x) ? (
            <button type="button" className={styles.link} onClick={() => onResend(x)}>
              {t('resend')}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
