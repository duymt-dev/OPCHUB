'use client';

import { useTranslations } from 'next-intl';
import { useNowTick } from '../hooks/use-events-url';
import { countdown } from '../model';
import type { EventView } from '../types';
import { Attendees, EventCover, useRegLabel } from './event-parts';
import styles from './event-hero.module.css';

interface Props {
  e: EventView;
  onOpen: (e: EventView) => void;
  onToggle: (e: EventView) => void;
}

/** Khối "SỰ KIỆN NỔI BẬT" có đếm ngược (sự kiện gần nhất) */
export function EventHero({ e, onOpen, onToggle }: Props) {
  const t = useTranslations('events');
  const label = useRegLabel();
  const now = useNowTick();
  const c = countdown(e.startsAt, now);
  const cells = [
    [c.days, t('hero.days')],
    [c.hours, t('hero.hours')],
    [c.minutes, t('hero.minutes')],
    [c.seconds, t('hero.seconds')],
  ] as const;

  return (
    <section className={styles.hero}>
      {/* Bấm nền mở chi tiết như prototype; bàn phím dùng nút trên thẻ ở lưới */}
      <button
        type="button"
        className={styles.hit}
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => onOpen(e)}
      />
      <div className={styles.bg}>
        <EventCover e={e} />
      </div>
      <div className={styles.shade} />
      <div className={styles.inner}>
        <div className={styles.info}>
          <div className={styles.tags}>
            <span className={styles.featured}>{t('hero.featured')}</span>
            <span className={styles.mode}>{t(`mode.${e.mode}`)}</span>
          </div>
          <div className={styles.title}>{e.title}</div>
          <div className={styles.when}>
            {e.day} · {e.time} · {e.place}
          </div>
          <div className={styles.people}>
            <Attendees srcs={e.avatars} />
            <span>{t('hero.registered', { count: e.regText })}</span>
          </div>
        </div>
        <div className={styles.side}>
          <div className={styles.countdown}>
            {cells.map(([v, l]) => (
              <div key={l} className={styles.cell}>
                <span className={styles.value}>{v}</span>
                <span className={styles.unit}>{l}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={styles.cta}
            data-state={e.reg}
            onClick={() => onToggle(e)}
          >
            {label(e)}
          </button>
        </div>
      </div>
    </section>
  );
}
