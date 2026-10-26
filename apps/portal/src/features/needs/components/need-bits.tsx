'use client';

import type { Need, NeedType } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { telLink, typeStyle, zaloLink } from '../model';
import styles from './needs.module.css';

/** Chip loại nhu cầu — màu prototype `NT` */
export function TypeChip({ type }: { type: NeedType }) {
  const t = useTranslations('needs.type');
  return (
    <span className={styles.chip} style={typeStyle(type)}>
      {t(type)}
    </span>
  );
}

const PHONE =
  'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z';
const MAIL = 'M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6';

function Glyph({ d, stroke, size }: { d: string; stroke: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * Zalo / Gọi điện / Email của người đăng (SĐT / email trên nhu cầu). Thiếu dữ liệu thì nút
 * vẫn giữ chỗ như prototype nhưng không bấm được.
 */
export function ContactButtons({
  n,
  small,
}: {
  n: Pick<Need, 'phone' | 'email'>;
  small?: boolean | undefined;
}) {
  const t = useTranslations('needs.contact');
  const size = small ? 14 : 15;
  const items = [
    { key: 'zalo', href: zaloLink(n.phone), body: 'Zalo' },
    { key: 'call', href: telLink(n.phone), body: <Glyph d={PHONE} stroke="#389E0D" size={size} /> },
    {
      key: 'email',
      href: n.email ? `mailto:${n.email}` : null,
      body: <Glyph d={MAIL} stroke="#D46B08" size={size} />,
    },
  ] as const;
  return (
    <div className={`${styles.contacts} ${small ? styles.contactSm : ''}`}>
      {items.map((a) =>
        a.href ? (
          <a
            key={a.key}
            href={a.href}
            title={t(a.key)}
            aria-label={t(a.key)}
            className={styles.contactBtn}
            data-action={a.key}
            {...(a.key === 'zalo' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {a.body}
          </a>
        ) : (
          <span
            key={a.key}
            title={t(a.key)}
            aria-disabled="true"
            className={`${styles.contactBtn} ${styles.contactOff}`}
            data-action={a.key}
          >
            {a.body}
          </span>
        ),
      )}
    </div>
  );
}
