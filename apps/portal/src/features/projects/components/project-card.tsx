'use client';

import type { ProjectCard } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { categoryCover, NEED_COLOR, ownerInitial, type badgeOf } from '../explore-model';
import { fmtNumber } from '../model';
import { Stroke } from './bits';
import styles from './project-card.module.css';

interface Props {
  p: ProjectCard;
  badge: ReturnType<typeof badgeOf>;
  onOpen: () => void;
  onFollow: () => void;
}

/** Ảnh bìa + huy hiệu (Nổi bật / nhu cầu) + tim (theo dõi) + giai đoạn */
function CardCover({ p, badge, onFollow }: Omit<Props, 'onOpen'>) {
  const t = useTranslations('projects');
  const cover = p.coverUrl ?? categoryCover(p.category);
  return (
    <div className={styles.cover} style={{ backgroundImage: `url('${cover}')` }}>
      {badge ? (
        <span
          className={styles.badge}
          style={{ background: badge.kind === 'hot' ? '#FF4D4F' : NEED_COLOR[badge.need] }}
        >
          {badge.kind === 'hot' ? t('card.hot') : t(`need.${badge.need}`)}
        </span>
      ) : null}
      <button
        type="button"
        className={styles.fav}
        title={t('card.fav')}
        aria-pressed={p.followedByMe}
        onClick={(e) => {
          e.stopPropagation();
          onFollow();
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={p.followedByMe ? '#FF4D4F' : 'none'}
          stroke={p.followedByMe ? '#FF4D4F' : 'rgba(0,0,0,0.45)'}
          strokeWidth="1.8"
          strokeLinejoin="round"
        >
          <path d="M12 20.5s-7.5-4.6-9.3-9.3C1.4 7.6 3.9 4 7.4 4c2 0 3.5 1.1 4.6 2.6C13.1 5.1 14.6 4 16.6 4c3.5 0 6 3.6 4.7 7.2-1.8 4.7-9.3 9.3-9.3 9.3z" />
        </svg>
      </button>
      <span className={styles.dev}>{t(`dev.${p.stage}`)}</span>
    </div>
  );
}

/** Thẻ dự án v4: ảnh bìa + huy hiệu + tim, giai đoạn, tỉnh, tên, mô tả, nhóm ngành + tag, chủ dự án */
export function ProjectGridCard({ p, badge, onOpen, onFollow }: Props) {
  const t = useTranslations('projects');
  return (
    <div
      className={styles.card}
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      <CardCover p={p} badge={badge} onFollow={onFollow} />
      <div className={styles.body}>
        <span className={styles.prov}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(0,0,0,0.55)">
            <path d="M12 2a7 7 0 00-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" />
          </svg>
          {p.province}
        </span>
        <span className={styles.name}>{p.name}</span>
        <span className={styles.short}>{p.summary}</span>
        <div className={styles.chips}>
          <span className={styles.cat}>{p.category}</span>
          {p.tags.slice(0, 2).map((g) => (
            <span key={g} className={styles.chip}>
              {g}
            </span>
          ))}
        </div>
        <div className={styles.foot}>
          <span className={`${styles.ini} ${styles[`t_${p.tone}`] ?? ''}`}>
            {ownerInitial(p.ownerName)}
          </span>
          <div className={styles.owner}>
            <span className={styles.ownerName}>{p.ownerName}</span>
            <span className={styles.who}>{t(`audience.${p.audience}`)}</span>
          </div>
          <span className={styles.meta}>
            <Stroke size={13} width={1.8}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </Stroke>
            {fmtNumber(p.views)}
          </span>
          <span className={styles.meta}>
            <Stroke size={13} width={1.8}>
              <path d="M21 12a8 8 0 01-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1121 12z" />
            </Stroke>
            {p.commentCount}
          </span>
        </div>
      </div>
    </div>
  );
}
