'use client';

import { tones } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { formatCount, sparkPoints, STAT_KEYS, STAT_TONES } from '../data';
import { useOverview } from '../hooks/use-overview';
import styles from './overview.module.css';

const DELTA_KEY = {
  members: 'membersDelta',
  communities: 'communitiesDelta',
  projects: 'projectsDelta',
  events: 'eventsDelta',
} as const;

export function StatCards() {
  const t = useTranslations('overview.stats');
  const { data } = useOverview();
  return (
    <div className={`${styles.card} ${styles.stats}`}>
      {data &&
        STAT_KEYS.map((key) => {
          const s = data[key];
          const tone = tones[STAT_TONES[key]];
          return (
            <div
              key={key}
              className={styles.stat}
              style={{ background: tone.bg, borderColor: tone.bd }}
            >
              <div className={styles.statLabel}>{t(key)}</div>
              <div className={styles.statRow}>
                <div className={styles.statValue}>{formatCount(s.value)}</div>
                <svg width="52" height="22" viewBox="0 0 52 22" aria-hidden="true">
                  <polyline
                    points={sparkPoints(s.spark)}
                    fill="none"
                    stroke={tone.fg}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.statDelta} style={{ color: tone.fg }}>
                {t(DELTA_KEY[key], {
                  count: data.projects.pending,
                  pct: formatCount(data.membersDeltaPct),
                  n: data.communitiesNew,
                  events: data.events.value,
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
