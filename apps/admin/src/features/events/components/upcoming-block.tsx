'use client';

import type { AdminUpcoming } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useUpcoming } from '../hooks/use-events';
import { inDaysKey, meetShort } from '../model';
import { Cover } from './event-grid';
import { useMeetActions } from './meet-actions';
import { ICON, Svg } from './svg';
import styles from './upcoming.module.css';

type Item = NonNullable<AdminUpcoming['next']>;

function useInDays() {
  const t = useTranslations('events.upcoming');
  return (n: number) => {
    const k = inDaysKey(n);
    return k.k === 'inDays' ? t('inDays', { n: k.n }) : t(k.k);
  };
}

const modeLabel = (m: Item['mode']) => (m === 'online' ? 'Online' : 'Offline');

/**
 * EV-R02: khối "Sắp diễn ra" đầu màn — sự kiện gần nhất (ảnh, link Meet, Mở Google Meet,
 * Xem chi tiết & danh sách) + cột "Tiếp theo" tối đa 3 sự kiện. Không có sự kiện → ẩn.
 */
export function UpcomingBlock({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useTranslations('events.upcoming');
  const q = useUpcoming();
  const inDays = useInDays();
  const meet = useMeetActions();
  const next = q.data?.next;
  if (!next) return null;
  const list = () => onOpen(next.id);
  return (
    <div className={styles.wrap}>
      <section className={styles.hero} aria-label={t('aria')}>
        <button type="button" className={styles.cover} onClick={list} aria-label={next.title}>
          <Cover e={next} />
          <span className={styles.badge}>{t('badge', { when: inDays(next.inDays) })}</span>
        </button>
        <div className={styles.info}>
          <span className={styles.kicker}>{t('kicker', { mode: modeLabel(next.mode) })}</span>
          <button type="button" className={styles.title} onClick={list}>
            {next.title}
          </button>
          <div className={styles.meta}>
            <span>
              {next.day} · {next.time}
            </span>
            <span>{next.place}</span>
            <span>{t('reg', { reg: next.registered, seats: next.seats })}</span>
          </div>
          {next.meetUrl ? (
            <div className={styles.meetBox}>
              <Svg d={ICON.video} stroke="#69B1FF" />
              <a href={next.meetUrl} target="_blank" rel="noopener noreferrer">
                {meetShort(next.meetUrl)}
              </a>
              <button type="button" onClick={() => void meet.copy(next.meetUrl ?? '')}>
                {t('copy')}
              </button>
            </div>
          ) : null}
          <div className={styles.actions}>
            {next.meetUrl ? (
              <button
                type="button"
                className={styles.primary}
                onClick={() => meet.open(next.meetUrl ?? '')}
              >
                {t('openMeet')}
              </button>
            ) : null}
            <button type="button" className={styles.ghost} onClick={list}>
              {t('detail')}
            </button>
          </div>
        </div>
      </section>
      <section className={styles.more} aria-label={t('more')}>
        <span className={styles.moreTitle}>{t('more')}</span>
        {q.data?.more.map((x) => (
          <button key={x.id} type="button" className={styles.row} onClick={() => onOpen(x.id)}>
            <span className={styles.when}>{inDays(x.inDays)}</span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{x.title}</span>
              <span className={styles.rowMeta}>
                {x.day} · {x.time} · {modeLabel(x.mode)}
              </span>
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}
