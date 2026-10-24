'use client';

import type { StoreDetail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { telLink, webLink, zaloLink } from '../model';
import styles from './detail.module.css';

/**
 * Thông tin liên hệ (REQ-510): 3 nút Email / Zalo / Gọi — ẩn nút thiếu dữ liệu (Q-V4-608-5).
 * Email / SĐT hiện dạng chữ để người xem chép được (link `mailto:` / `tel:` có thể bị chặn).
 */
export function DetailContact({ s }: { s: StoreDetail }) {
  const t = useTranslations('stores.detail');
  const zalo = zaloLink(s.phone);
  const tel = telLink(s.phone);
  const web = webLink(s.website);
  const actions = [
    s.email ? { key: 'email', href: `mailto:${s.email}`, label: t('email') } : null,
    zalo ? { key: 'zalo', href: zalo, label: t('zalo') } : null,
    tel ? { key: 'call', href: tel, label: t('call') } : null,
  ].filter((a) => a !== null);
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <span>{t('contact')}</span>
      </div>
      <div className={styles.contact}>
        {s.phone ? <span className={styles.link}>{s.phone}</span> : null}
        {s.email ? <span className={styles.link}>{s.email}</span> : null}
        {web ? (
          <a href={web} target="_blank" rel="noopener noreferrer" className={styles.link}>
            {s.website}
          </a>
        ) : null}
        {s.address ? <span>{s.address}</span> : null}
        {actions.length ? (
          <div className={styles.actions}>
            {actions.map((a) => (
              <a
                key={a.key}
                href={a.href}
                className={styles.action}
                data-action={a.key}
                {...(a.key === 'zalo' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {a.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
