'use client';

import type { ProjectCard } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { fmtNumber, money, STAGE_TONE } from '../model';
import { Face, Mono, Pic, Tag } from './bits';
import styles from './list.module.css';

interface Props {
  items: ProjectCard[];
  colorOf: (category: string) => string;
  onOpen: (p: ProjectCard) => void;
  onFollow: (p: ProjectCard) => void;
}

/** Lưới thẻ dự án (P-55) */
export function ProjectGrid({ items, colorOf, onOpen }: Omit<Props, 'onFollow'>) {
  const t = useTranslations('projects.card');
  return (
    <div className={styles.grid}>
      {items.map((p) => (
        <div
          key={p.id}
          className={styles.card}
          role="link"
          tabIndex={0}
          onClick={() => onOpen(p)}
          onKeyDown={(e) => e.key === 'Enter' && onOpen(p)}
        >
          <div className={styles.cardCover}>
            <Pic src={p.coverUrl} className={styles.fill} />
            {p.funding ? (
              <span className={styles.fundBadge}>
                {t('fund', {
                  amount: money(p.funding.amount, p.funding.currency),
                  equity: p.funding.equityPercent,
                })}
              </span>
            ) : null}
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardCat} style={{ color: colorOf(p.category) }}>
              <i className={styles.dot} style={{ background: colorOf(p.category) }} />
              {p.category}
            </span>
            <span className={styles.cardName}>{p.name}</span>
            <span className={styles.cardShort}>{p.summary}</span>
            <div className={styles.cardFoot}>
              <Face name={p.ownerName} src={p.ownerAvatarUrl} size={28} />
              <span className={styles.cardOwner}>{p.ownerName}</span>
              <span className={styles.cardMeta}>
                {t('meta', { followers: fmtNumber(p.followers), comments: p.commentCount })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Bảng dự án (P-56) — dưới 768px mỗi dòng thành thẻ như prototype */
export function ProjectTable({ items, onOpen, onFollow }: Omit<Props, 'colorOf'>) {
  const t = useTranslations('projects');
  return (
    <div className={styles.table}>
      <div className={styles.tableInner}>
        <div className={`${styles.tr} ${styles.th}`}>
          <span>{t('table.project')}</span>
          <span>{t('table.category')}</span>
          <span>{t('table.stage')}</span>
          <span>{t('table.owner')}</span>
          <span>{t('table.followers')}</span>
          <span />
        </div>
        {items.map((p) => (
          <div key={p.id} className={styles.tr}>
            <button type="button" className={styles.tdMain} onClick={() => onOpen(p)}>
              <Mono name={p.name} tone={p.tone} size={36} />
              <span className={styles.tdText}>
                <b className={styles.tdName}>{p.name}</b>
                <span className={styles.tdShort}>{p.summary}</span>
              </span>
            </button>
            <span className={styles.tdCat}>{p.category}</span>
            <Tag tone={STAGE_TONE[p.stage]} className={styles.tdStage}>
              {t(`stage.${p.stage}`)}
            </Tag>
            <div className={styles.tdOwner}>
              <Face name={p.ownerName} src={p.ownerAvatarUrl} size={28} />
              <span>{p.ownerName}</span>
            </div>
            <span>{fmtNumber(p.followers)}</span>
            <button
              type="button"
              className={`${styles.followBtn} ${p.followedByMe ? styles.followOn : ''}`}
              onClick={() => onFollow(p)}
            >
              {p.followedByMe ? t('follow.on') : t('follow.off')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
