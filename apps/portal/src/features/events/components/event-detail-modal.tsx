'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { mapEmbedOf, mapLinkOf } from '../model';
import type { EventView } from '../types';
import styles from './event-detail.module.css';
import { Attendees, EventCover, PinIcon, useRegLabel } from './event-parts';

interface Props {
  e: EventView;
  onClose: () => void;
  onToggle: (e: EventView) => void;
}

/** Bản đồ + địa chỉ cho sự kiện offline có địa chỉ */
function MapBlock({ address }: { address: string }) {
  const t = useTranslations('events.detail');
  return (
    <div className={styles.mapBox}>
      <div className={styles.map}>
        <iframe title={t('map')} src={mapEmbedOf(address)} loading="lazy" />
      </div>
      <div className={styles.address}>
        <PinIcon size={16} color="#FF4D4F" />
        <span>{address}</span>
        <a href={mapLinkOf(address)} target="_blank" rel="noopener noreferrer">
          {t('directions')}
        </a>
      </div>
    </div>
  );
}

/** P-52 → P-54: chi tiết sự kiện — có URL `/events/:id` (D-39); hộp tự vẽ, không motion */
export function EventDetailModal({ e, onClose, onToggle }: Props) {
  const t = useTranslations('events');
  const label = useRegLabel();
  useEffect(() => {
    const onKey = (k: KeyboardEvent) => k.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const showMap = e.mode === 'offline' && !!e.address;

  return (
    <div className={styles.mask}>
      <button
        type="button"
        className={styles.backdrop}
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={e.title}>
        <div className={styles.cover}>
          <EventCover e={e} />
          <button
            type="button"
            className={styles.close}
            aria-label={t('detail.close')}
            onClick={onClose}
          >
            ×
          </button>
          <span className={styles.mode}>{t(`mode.${e.mode}`)}</span>
        </div>
        <div className={styles.body}>
          <div className={styles.title}>{e.title}</div>
          <div className={styles.facts}>
            <div className={styles.fact}>
              <div>{t('detail.time')}</div>
              <div>
                {e.day}, {e.time}
              </div>
            </div>
            <div className={styles.fact}>
              <div>{t('detail.place')}</div>
              <div>{e.place}</div>
            </div>
          </div>
          <div className={styles.desc}>{e.description}</div>
          {showMap && e.address ? <MapBlock address={e.address} /> : null}
          <div className={styles.seats}>
            <Attendees order={e.order} />
            <div className={styles.bar}>
              <div className={styles.barHead}>
                <span>{t('card.registered')}</span>
                <b>{e.regText}</b>
              </div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${e.pct}%` }} />
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.reg}
            data-state={e.reg}
            aria-disabled={e.reg === 'full'}
            onClick={() => onToggle(e)}
          >
            {label(e)}
          </button>
        </div>
      </div>
    </div>
  );
}
