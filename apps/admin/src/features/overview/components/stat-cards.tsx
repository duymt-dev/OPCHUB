'use client';

import { tones } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { OVERVIEW_STATS } from '../data';
import styles from './overview.module.css';

const DELTA_KEY = {
  members: 'membersDelta',
  communities: 'communitiesDelta',
  projects: 'projectsDelta',
  events: 'eventsDelta',
} as const;

export function StatCards() {
  const t = useTranslations('overview.stats');
  return (
    <div className={`${styles.card} ${styles.stats}`}>
      {OVERVIEW_STATS.map((s) => {
        const tone = tones[s.tone];
        return (
          <div
            key={s.key}
            className={styles.stat}
            style={{ background: tone.bg, borderColor: tone.bd }}
          >
            <div className={styles.statLabel}>{t(s.key)}</div>
            <div className={styles.statRow}>
              <div className={styles.statValue}>{s.value}</div>
              <svg width="52" height="22" viewBox="0 0 52 22" aria-hidden="true">
                <polyline
                  points={s.spark}
                  fill="none"
                  stroke={tone.fg}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.statDelta} style={{ color: tone.fg }}>
              {t(DELTA_KEY[s.key], { count: s.pendingProjects ?? 0 })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
