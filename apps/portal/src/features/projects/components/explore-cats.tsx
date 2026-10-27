'use client';

import type { ProjectStats } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CAT_TILES, categoryIcon } from '../explore-model';
import { Stroke } from './bits';
import styles from './explore-cats.module.css';

interface Props {
  categories: ProjectStats['categories'];
  total: number;
  active: string;
  onPick: (cat: string) => void;
}

/** "Nhóm ngành giải pháp địa phương": ô "Tất cả" + nhóm ngành bật cho dự án, "Xem thêm / Thu gọn" */
export function ExploreCats({ categories, total, active, onPick }: Props) {
  const t = useTranslations('projects.cats');
  const [more, setMore] = useState(false);
  const tiles = [{ name: 'all', count: total }, ...categories].slice(
    0,
    more ? undefined : CAT_TILES,
  );
  return (
    <div className={styles.wrap}>
      <span className={styles.title}>{t('title')}</span>
      <div className={styles.grid}>
        {tiles.map((c) => {
          const label = c.name === 'all' ? t('all') : c.name;
          return (
            <button
              key={c.name}
              type="button"
              aria-pressed={active === c.name}
              title={`${label} · ${c.count}`}
              className={`${styles.tile} ${active === c.name ? styles.on : ''}`}
              onClick={() => onPick(c.name)}
            >
              <Stroke size={22} width={1.8}>
                <path d={categoryIcon(c.name)} />
              </Stroke>
              <span className={styles.label}>{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`${styles.tile} ${styles.more}`}
          onClick={() => setMore(!more)}
        >
          <span className={styles.dots}>···</span>
          <span className={styles.moreL}>{more ? t('less') : t('more')}</span>
        </button>
      </div>
    </div>
  );
}
