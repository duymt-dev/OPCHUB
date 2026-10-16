'use client';

import type { ProjectStats } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { fmtNumber } from '../model';
import { Face, Mono, Pic, Stroke } from './bits';
import styles from './featured.module.css';

const STAT_ICONS = {
  total: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  growing: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  countries:
    'M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  following: 'M12 21l-8.5-8.3A5 5 0 0112 5.6a5 5 0 018.5 7.1z',
} as const;
const STAT_TONE = { total: 'blue', growing: 'green', countries: 'amber', following: 'rose' };

/** 4 ô thống kê đầu màn Khám phá */
export function ExploreStats({ stats }: { stats: ProjectStats }) {
  const t = useTranslations('projects.stats');
  const keys = ['total', 'growing', 'countries', 'following'] as const;
  return (
    <div className={styles.stats}>
      {keys.map((k) => (
        <div key={k} className={styles.stat}>
          <span className={`${styles.statIcon} ${styles[`st_${STAT_TONE[k]}`] ?? ''}`}>
            <Stroke size={20}>
              <path d={STAT_ICONS[k]} />
            </Stroke>
          </span>
          <div className={styles.statText}>
            <span className={styles.statLabel}>{t(k)}</span>
            <span className={styles.statValue}>{stats[k]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

type Featured = NonNullable<ProjectStats['featured']>;

/** "★ DỰ ÁN NỔI BẬT TUẦN" — dự án nhiều theo dõi nhất (hoặc admin đặt) */
export function FeaturedCard({ p, onOpen }: { p: Featured; onOpen: () => void }) {
  const t = useTranslations('projects');
  return (
    <div
      className={styles.feat}
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      <div className={styles.featCover}>
        <Pic src={p.coverUrl} />
        <span className={styles.featBadge}>{t('featured.badge')}</span>
      </div>
      <div className={styles.featBody}>
        <div className={styles.featHead}>
          <Mono name={p.name} tone={p.tone} size={48} />
          <div className={styles.col2}>
            <span className={styles.featName}>{p.name}</span>
            <span className={styles.featSub}>
              {p.category} · {p.country}
            </span>
          </div>
        </div>
        <div className={styles.featLong}>{p.description}</div>
        <div className={styles.featTags}>
          {p.tags.map((tag) => (
            <span key={tag} className={styles.featTag}>
              {tag}
            </span>
          ))}
        </div>
        <div className={styles.featMetrics}>
          <div className={styles.metric}>
            <span className={styles.metricV}>{fmtNumber(p.followers)}</span>
            <span className={styles.metricL}>{t('featured.followers')}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricV}>{t(`stage.${p.stage}`)}</span>
            <span className={styles.metricL}>{t('featured.stage')}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricV}>{p.country}</span>
            <span className={styles.metricL}>{t('featured.country')}</span>
          </div>
        </div>
        <div className={styles.featOwner}>
          <Face name={p.ownerName} src={p.ownerAvatarUrl} size={28} />
          <div className={styles.featOwnerText}>
            <span className={styles.featOwnerName}>{p.ownerName}</span>
            <span className={styles.featOwnerSub}>
              {t('featured.owner', { group: p.groupName })}
            </span>
          </div>
          <button type="button" className={styles.featBtn}>
            {t('featured.view')}
          </button>
        </div>
      </div>
    </div>
  );
}
