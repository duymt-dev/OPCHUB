'use client';

import type { ProjectStats } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { fmtNumber } from '../model';
import { HERO_IMAGE, POPULAR_SEARCHES } from '../explore-model';
import { Stroke } from './bits';
import styles from './explore-hero.module.css';

interface Props {
  stats: ProjectStats;
  q: string;
  onQ: (q: string) => void;
  onNew: () => void;
}

/** Hero "Dự án OPC": tìm kiếm, tìm kiếm phổ biến, 3 số, kêu gọi đăng dự án (prototype v4) */
export function ExploreHero({ stats, q, onQ, onNew }: Props) {
  const t = useTranslations('projects.hero');
  const nums = [
    { key: 'published', v: stats.total, c: '#1677FF' },
    { key: 'owners', v: stats.owners, c: '#13A8A8' },
    { key: 'connections', v: stats.connections, c: '#722ED1' },
  ] as const;
  return (
    <div className={styles.hero} style={{ backgroundImage: `url('${HERO_IMAGE}')` }}>
      <div className={styles.shade} />
      <div className={styles.left}>
        <span className={styles.title}>{t('title')}</span>
        <span className={styles.sub}>{t('sub')}</span>
        <span className={styles.desc}>{t('desc')}</span>
        <form
          className={styles.search}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onQ(q.trim());
          }}
        >
          <Stroke size={16} width={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </Stroke>
          <input
            className={styles.searchInput}
            value={q}
            placeholder={t('search')}
            aria-label={t('search')}
            onChange={(e) => onQ(e.target.value)}
          />
          <button type="submit" className={styles.searchBtn}>
            {t('go')}
          </button>
        </form>
        <div className={styles.popular}>
          <span className={styles.popHead}>{t('popular')}</span>
          {POPULAR_SEARCHES.map((l) => (
            <button key={l} type="button" className={styles.popChip} onClick={() => onQ(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.nums}>
          {nums.map((n) => (
            <div key={n.key} className={styles.num}>
              <span className={styles.numV} style={{ color: n.c }}>
                {fmtNumber(n.v)}
              </span>
              <span className={styles.numL}>{t(n.key)}</span>
            </div>
          ))}
        </div>
        <div className={styles.cta}>
          <span className={styles.ctaTitle}>{t('ctaTitle')}</span>
          <span className={styles.ctaText}>{t('ctaText')}</span>
          <button type="button" className={styles.ctaBtn} onClick={onNew}>
            {t('ctaBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
