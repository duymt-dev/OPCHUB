'use client';

import { COVER_DEFAULT_SRC, groupCoverSrc } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { SyntheticEvent } from 'react';
import type { EventView } from '../types';
import styles from './event-card.module.css';

/** Phần dùng chung cho thẻ, hero và modal chi tiết */

/** Ảnh lỗi → ảnh bìa mặc định tự host (D-36) */
const swapToFallback = (e: SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  if (!img.src.endsWith(COVER_DEFAULT_SRC)) img.src = COVER_DEFAULT_SRC;
};

/** BUG-011: ảnh bìa `coverUrl` của API; chưa có → ảnh mặc định tự host */
export function EventCover({ e, className }: { e: EventView; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Dynamic storage cover keeps the D-36 onError fallback.
    <img
      className={className ?? styles.coverImg}
      src={groupCoverSrc(e.coverUrl)}
      alt=""
      onError={swapToFallback}
    />
  );
}

/** BUG-011: ≤ 4 ảnh người đăng ký thật; không có ảnh → không vẽ */
export function Attendees({ srcs, size }: { srcs: string[]; size?: 'lg' }) {
  if (!srcs.length) return null;
  return (
    <div className={styles.avatars} data-size={size}>
      {srcs.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- Small attendee avatars use arbitrary storage URLs from the API.
        <img key={`${src}-${i}`} src={src} alt="" />
      ))}
    </div>
  );
}

/** Nhãn nút đăng ký theo trạng thái */
export function useRegLabel() {
  const t = useTranslations('events.action');
  return (e: EventView) =>
    e.reg === 'registered'
      ? t('cancel')
      : e.reg === 'closed'
        ? t('closed')
        : e.reg === 'full'
          ? t('full')
          : t('register');
}

export function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(0,0,0,0.45)"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function PinIcon({ size = 14, color = 'rgba(0,0,0,0.45)' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
