'use client';

import type { ProjectDetail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { STAGE_TONE } from '../model';
import { Contacts, HeroContactButtons } from './detail-contact';
import { DETAIL_TABS, type DetailTab } from '../types';
import { Mono, Pic, Tag } from './bits';
import styles from './detail.module.css';

interface Props {
  p: ProjectDetail;
  commentCount: number;
  tab: DetailTab;
  onTab: (t: DetailTab) => void;
  onFollow: () => void;
  onBack: () => void;
}

/** Breadcrumb + ảnh bìa + tên/giai đoạn + theo dõi + liên hệ + tab */
export function DetailHero({ p, commentCount, tab, onTab, onFollow, onBack }: Props) {
  const t = useTranslations('projects');
  return (
    <>
      <nav className={styles.crumb} aria-label="breadcrumb">
        <button type="button" className={styles.crumbLink} onClick={onBack}>
          {t('detail.crumb')}
        </button>
        <span>/</span>
        <span className={styles.crumbCur}>{p.name}</span>
      </nav>
      <div className={styles.heroCard}>
        <div className={styles.cover}>
          <Pic src={p.coverUrl} />
        </div>
        <div className={styles.heroRow}>
          <Mono name={p.name} tone={p.tone} size={96} />
          <div className={styles.heroText}>
            <div className={styles.heroTitle}>
              <span className={styles.heroName}>{p.name}</span>
              <span className={styles.heroStage}>
                <Tag tone={STAGE_TONE[p.stage]}>{t(`stage.${p.stage}`)}</Tag>
              </span>
            </div>
            <span className={styles.heroShort}>{p.summary}</span>
          </div>
          <div className={styles.heroActs}>
            <button
              type="button"
              className={`${styles.followBtn} ${p.followedByMe ? styles.followOn : ''}`}
              onClick={onFollow}
            >
              {p.followedByMe ? t('follow.on') : t('follow.off')}
            </button>
            <HeroContactButtons p={p} />
          </div>
        </div>
        <Contacts p={p} />
        <HeroTabs tab={tab} onTab={onTab} commentCount={commentCount} fund={p.fundraisingActive} />
      </div>
    </>
  );
}

function HeroTabs({
  tab,
  onTab,
  commentCount,
  fund,
}: Pick<Props, 'tab' | 'onTab' | 'commentCount'> & { fund: boolean }) {
  const t = useTranslations('projects');
  return (
    <div className={styles.tabs} role="tablist">
      {DETAIL_TABS.filter((k) => k !== 'fund' || fund).map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={tab === k}
          className={`${styles.tab} ${tab === k ? styles.tabOn : ''}`}
          onClick={() => onTab(k)}
        >
          {k === 'feedback' ? t('tabs.feedback', { n: commentCount }) : t(`tabs.${k}`)}
        </button>
      ))}
    </div>
  );
}
