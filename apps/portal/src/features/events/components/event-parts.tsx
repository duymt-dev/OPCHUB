'use client';

import { useTranslations } from 'next-intl';
import type { SyntheticEvent } from 'react';
import { attendeesOf, eventCover, eventCoverFallback } from '../media';
import type { EventView } from '../types';
import styles from './event-card.module.css';

/** Phần dùng chung cho thẻ, hero và modal chi tiết */

const swapToFallback = (id: string) => (e: SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  const fb = eventCoverFallback(id);
  if (img.src !== fb) img.src = fb;
};

export function EventCover({ e, className }: { e: EventView; className?: string }) {
  return (
    <img
      className={className ?? styles.coverImg}
      src={eventCover(e.id)}
      alt=""
      onError={swapToFallback(e.id)}
    />
  );
}

export function Attendees({ order, size }: { order: number; size?: 'lg' }) {
  return (
    <div className={styles.avatars} data-size={size}>
      {attendeesOf(order).map((src, i) => (
        <img key={`${src}-${i}`} src={src} alt="" />
      ))}
    </div>
  );
}

/** Nhãn nút đăng ký theo trạng thái */
export function useRegLabel() {
  const t = useTranslations('events.action');
  return (e: EventView) =>
    e.reg === 'registered' ? t('cancel') : e.reg === 'full' ? t('full') : t('register');
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
