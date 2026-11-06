'use client';

import type { StoreDetail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { storeSocialLinks, telLink, webLink, zaloLink } from '../model';
import styles from './detail.module.css';
import { SocialIcon } from './wizard/social-icon';
import p from './detail-profile.module.css';

/**
 * Thông tin liên hệ (REQ-510): 3 nút Email / Zalo / Gọi — ẩn nút thiếu dữ liệu (Q-V4-608-5).
 * D-97: hotline / email / địa chỉ phụ (TIP-V42-710), mạng xã hội mở link thật.
 * Email / SĐT hiện dạng chữ để người xem chép được (link `mailto:` / `tel:` có thể bị chặn).
 */
type ContactData = Pick<
  StoreDetail,
  'phone' | 'email' | 'website' | 'address' | 'phones' | 'emails' | 'addresses' | 'socials'
>;

export function DetailContact({ s }: { s: ContactData }) {
  const t = useTranslations('stores.detail');
  const soc = useTranslations('stores.wizard.social');
  const zalo = zaloLink(s.phone);
  const tel = telLink(s.phone);
  const web = webLink(s.website);
  const socials = storeSocialLinks(s);
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
        {s.phones.filter(Boolean).map((v) => (
          <span key={v} className={styles.link}>
            {v}
          </span>
        ))}
        {s.email ? <span className={styles.link}>{s.email}</span> : null}
        {s.emails.filter(Boolean).map((v) => (
          <span key={v} className={styles.link}>
            {v}
          </span>
        ))}
        {web ? (
          <a href={web} target="_blank" rel="noopener noreferrer" className={styles.link}>
            {s.website}
          </a>
        ) : null}
        {s.address ? <span>{s.address}</span> : null}
        {s.addresses.filter(Boolean).map((v) => (
          <span key={v}>{v}</span>
        ))}
        {socials.length ? (
          <div className={p.socRow}>
            {socials.map((o) => (
              <a
                key={o.k}
                href={o.href}
                target="_blank"
                rel="noopener noreferrer"
                title={soc(o.k)}
                className={p.socCircle}
              >
                <SocialIcon k={o.k} size={34} />
              </a>
            ))}
          </div>
        ) : null}
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
