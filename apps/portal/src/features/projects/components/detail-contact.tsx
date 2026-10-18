'use client';

import type { ProjectDetail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { contactLinks } from '../contact-model';
import { Stroke } from './bits';
import styles from './detail.module.css';
import side from './detail-side.module.css';

/**
 * Liên hệ chủ dự án (QT-09 bước 6, BUG-016/BUG-021): chỉ kênh chủ dự án tự công khai
 * (`p.contact`), không có địa chỉ; kênh nào trống thì ẩn nút đó.
 */

/** Nút biểu tượng cạnh "Theo dõi" ở hero */
export function HeroContactButtons({ p }: { p: ProjectDetail }) {
  const t = useTranslations('projects.detail');
  const l = contactLinks(p.contact);
  return (
    <>
      {l.email ? (
        <a
          className={styles.iconBtn}
          href={l.email.href}
          title={t('emailTitle', { email: l.email.label })}
        >
          <Stroke size={18}>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </Stroke>
        </a>
      ) : null}
      {l.zalo ? (
        <a
          className={styles.iconBtn}
          href={l.zalo.href}
          target="_blank"
          rel="noreferrer"
          title={t('zaloTitle', { phone: l.zalo.label })}
        >
          <span className={styles.zalo}>Zalo</span>
        </a>
      ) : null}
      {l.call ? (
        <a
          className={`${styles.iconBtn} ${styles.callBtn}`}
          href={l.call.href}
          title={t('callTitle', { phone: l.call.label })}
        >
          <Stroke size={18}>
            <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z" />
          </Stroke>
        </a>
      ) : null}
    </>
  );
}

/** Dải liên hệ dưới hero: Email, Zalo, Điện thoại (không còn Địa chỉ) */
export function Contacts({ p }: { p: ProjectDetail }) {
  const t = useTranslations('projects.detail');
  const l = contactLinks(p.contact);
  const rows = [
    { k: 'email', v: l.email },
    { k: 'zalo', v: l.zalo },
    { k: 'phone', v: l.call },
  ] as const;
  const shown = rows.filter((r) => r.v !== null);
  if (!shown.length) return null;
  return (
    <div className={styles.contacts}>
      {shown.map((c) => (
        <div key={c.k} className={styles.contact}>
          <span className={styles.contactL}>{t(c.k)}</span>
          <a className={styles.contactV} href={c.v?.href}>
            {c.v?.label}
          </a>
        </div>
      ))}
    </div>
  );
}

/** Nút Email / Zalo / Gọi trong thẻ chủ dự án — thay nút "Nhắn tin" (BUG-021) */
export function OwnerContactActions({ p }: { p: ProjectDetail }) {
  const t = useTranslations('projects.detail');
  const l = contactLinks(p.contact);
  if (!l.email && !l.zalo && !l.call) {
    return <span className={side.muted12}>{t('noContact')}</span>;
  }
  return (
    <div className={side.contactActs}>
      {l.email ? (
        <a className={side.contactBtn} href={l.email.href}>
          {t('email')}
        </a>
      ) : null}
      {l.zalo ? (
        <a className={side.contactBtn} href={l.zalo.href} target="_blank" rel="noreferrer">
          {t('zalo')}
        </a>
      ) : null}
      {l.call ? (
        <a className={side.contactBtn} href={l.call.href}>
          {t('call')}
        </a>
      ) : null}
    </div>
  );
}
