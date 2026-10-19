'use client';

import { useTranslations } from 'next-intl';
import type { EventView } from '../types';
import styles from './event-card.module.css';
import { Attendees, ClockIcon, EventCover, PinIcon, useRegLabel } from './event-parts';

interface Props {
  e: EventView;
  onOpen: (e: EventView) => void;
  onToggle: (e: EventView) => void;
}

/** Thẻ sự kiện trong lưới (P-49) */
export function EventCard({ e, onOpen, onToggle }: Props) {
  const t = useTranslations('events');
  const label = useRegLabel();
  return (
    <article className={styles.card}>
      <button type="button" className={styles.cover} tabIndex={-1} onClick={() => onOpen(e)}>
        <EventCover e={e} />
        <div className={styles.shade} />
        <span className={styles.modeTag}>{t(`mode.${e.mode}`)}</span>
      </button>
      <div className={styles.body}>
        <button type="button" className={styles.title} onClick={() => onOpen(e)}>
          {e.title}
        </button>
        <div className={styles.meta}>
          <span>
            <ClockIcon />
            {e.day} · {e.time}
          </span>
          <span>
            <PinIcon />
            {e.place}
          </span>
        </div>
        <div className={styles.seats}>
          <Attendees srcs={e.avatars} />
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
        <div className={styles.actions}>
          <button type="button" className={styles.detailBtn} onClick={() => onOpen(e)}>
            {t('card.detail')}
          </button>
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
    </article>
  );
}
