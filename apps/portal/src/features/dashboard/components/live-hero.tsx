'use client';

import type { DashboardLive } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { clockParts, fmtNumber, refreshIn } from '../model';
import styles from './live-hero.module.css';

interface Props {
  data: DashboardLive;
  now: number;
  chatting: number;
  atEvent: number;
}

/** Khối LIVE: tiêu đề, đồng hồ, 4 ô thống kê */
export function LiveHero({ data, now, chatting, atEvent }: Props) {
  const t = useTranslations('dashboard');
  const clock = clockParts(now);
  const { stats } = data;
  const tiles = [
    {
      label: t('stats.online'),
      value: stats.online,
      tone: 'green',
      sub: t('stats.onlineSub', { n: chatting }),
      subTone: 'muted',
    },
    {
      label: t('stats.total'),
      value: stats.totalMembers,
      tone: 'dark',
      sub: t('stats.totalSub', { n: stats.joinsLastMinute }),
      subTone: 'green',
    },
    {
      label: t('stats.messages'),
      value: stats.messagesToday,
      tone: 'dark',
      sub: t('stats.messagesSub', { n: stats.messagesLastMinute }),
      subTone: 'blue',
    },
    {
      label: t('stats.events'),
      value: stats.eventJoins,
      tone: 'blue',
      sub: t('stats.eventsSub', { n: atEvent }),
      subTone: 'muted',
    },
  ] as const;

  return (
    <section className={styles.hero}>
      <div className={styles.top}>
        <div className={styles.intro}>
          <div className={styles.kickerRow}>
            <span className={styles.live}>
              <i className={styles.blink} />
              {t('hero.live')}
            </span>
            <span className={styles.kicker}>{t('hero.kicker')}</span>
          </div>
          <h2 className={styles.title}>{t('hero.title')}</h2>
          <div className={styles.sub}>
            {t('hero.sub', { communities: data.communityCount, countries: data.countryCount })}
          </div>
        </div>
        <div className={styles.clock}>
          <span className={styles.time}>{clock.time}</span>
          <span className={styles.date}>{clock.date}</span>
          <span className={styles.refresh}>
            <i className={styles.spin} />
            {t('hero.refresh', { s: refreshIn(now) })}
          </span>
        </div>
      </div>
      <div className={styles.tiles}>
        {tiles.map((s) => (
          <div key={s.label} className={styles.tile}>
            <span className={styles.tileLabel}>{s.label}</span>
            <span className={styles.tileValue} data-tone={s.tone}>
              {fmtNumber(s.value)}
            </span>
            <span className={styles.tileSub} data-tone={s.subTone}>
              {s.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
