'use client';

import type { AdminInvestor } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { KIND_TONE, STATUS_TONE } from '../model';
import styles from './tags.module.css';

export function KindTag({
  kind,
  className,
}: {
  kind: AdminInvestor['kind'];
  className?: string | undefined;
}) {
  const t = useTranslations('investors.kind');
  return (
    <span className={`${styles.kind} ${styles[KIND_TONE[kind]]} ${className ?? ''}`}>
      {t(kind)}
    </span>
  );
}

export function StatusTag({ status }: { status: AdminInvestor['status'] }) {
  const t = useTranslations('investors.status');
  return <span className={`${styles.st} ${styles[STATUS_TONE[status]]}`}>{t(status)}</span>;
}

/** Ảnh tròn; không có ảnh → chấm xanh như prototype */
export function InvestorAvatar({ src, size }: { src: string | null; size: 36 | 48 }) {
  const box = size === 48 ? styles.s48 : styles.s36;
  if (!src)
    return (
      <span className={`${styles.dot} ${box}`} aria-hidden>
        •
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element -- URL ảnh storage động (NA-26), không qua next/image
  return <img className={`${styles.av} ${box}`} src={src} alt="" />;
}
