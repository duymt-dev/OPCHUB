'use client';

import { tones } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { formatCount, sparkPoints, statCards, STAT_TONES } from '../data';
import { useOverview } from '../hooks/use-overview';
import { useOverviewUrl } from '../hooks/use-overview-url';
import styles from './overview.module.css';

export function StatCards() {
  const t = useTranslations('overview.stats');
  const { data } = useOverview();
  const custom = !!useOverviewUrl().params.from;
  return (
    <div className={`${styles.card} ${styles.stats}`}>
      {data &&
        statCards(data).map((s) => {
          const tone = tones[STAT_TONES[s.key]];
          return (
            <div
              key={s.key}
              className={styles.stat}
              style={{ background: tone.bg, borderColor: tone.bd }}
            >
              <div className={styles.statLabel}>{t(s.key)}</div>
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
                {t(
                  custom && s.key === 'members'
                    ? 'membersRangeDelta'
                    : custom && s.key === 'fresh'
                      ? 'freshRangeDelta'
                      : `${s.key}Delta`,
                  s.delta,
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
