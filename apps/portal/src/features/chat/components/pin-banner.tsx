'use client';

import type { RoomPin } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import styles from './pin-banner.module.css';

interface Props {
  pins: RoomPin[];
  canUnpin: boolean;
  onUnpin: (messageId: string) => void;
}

export function PinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 17v5M9 3h6l-1 6 4 4H6l4-4z" fill="#FAAD14" stroke="#D48806" strokeWidth="1.5" />
    </svg>
  );
}

/** Banner vàng: tin ghim mới nhất + "N tin đã ghim"; bấm để mở danh sách */
export function PinBanner({ pins, canUnpin, onUnpin }: Props) {
  const t = useTranslations('chat.pin');
  const [open, setOpen] = useState(false);
  const top = pins[0];
  if (!top) return null;
  return (
    <div className={styles.banner}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <PinIcon />
        <span className={styles.top}>
          <b>{top.senderName}:</b> {top.text}
        </span>
        <span className={styles.count}>
          {t('count', { n: pins.length, arrow: open ? '▴' : '▾' })}
        </span>
      </button>
      {open ? (
        <div className={styles.list}>
          {pins.map((p) => (
            <div key={p.messageId} className={styles.item}>
              <span className={styles.itemText}>
                <b>{p.senderName}</b> · {p.text}
              </span>
              {canUnpin ? (
                <button type="button" className={styles.unpin} onClick={() => onUnpin(p.messageId)}>
                  {t('unpin')}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
