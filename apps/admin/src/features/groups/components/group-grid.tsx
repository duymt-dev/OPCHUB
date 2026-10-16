'use client';

import { groupCoverFallback, groupCoverSrc } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { SyntheticEvent } from 'react';
import { formatCount, initialsOf, toneOf } from '../model';
import type { AdminGroup } from '../types';
import styles from './group-grid.module.css';

export interface GroupRowActions {
  onEdit: (g: AdminGroup) => void;
  onExport: (g: AdminGroup) => void;
  onChat: (g: AdminGroup) => void;
  onDelete: (g: AdminGroup) => void;
}

/** Ảnh bìa: ảnh lỗi thì đổi sang ảnh ngẫu nhiên theo id như prototype */
export function Cover({ g }: { g: AdminGroup }) {
  const onError = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const fb = groupCoverFallback(g.id);
    if (img.src !== fb) img.src = fb;
  };
  return <img className={styles.img} src={groupCoverSrc(g.id)} alt="" onError={onError} />;
}

function Card({ g, a }: { g: AdminGroup; a: GroupRowActions }) {
  const t = useTranslations('groups.list');
  const tone = toneOf(g.order);
  return (
    <article className={styles.card}>
      <div className={styles.cover}>
        <Cover g={g} />
        <div className={styles.shade} />
        <span className={styles.badge}>{t('active')}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          {/* Màu chữ viết tắt là tông dữ liệu của nhóm (động) */}
          <span className={styles.mono} style={{ background: tone.bg, color: tone.fg }}>
            {initialsOf(g.name)}
          </span>
          <div className={styles.names}>
            <b className={styles.name}>{g.name}</b>
            <span className={styles.region}>{g.region}</span>
          </div>
        </div>
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <b>{formatCount(g.memberCount)}</b>
            <span>{t('membersLabel')}</span>
          </div>
          <div className={styles.metric}>
            <b>{formatCount(g.weeklyActive)}</b>
            <span>{t('weeklyLabel')}</span>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.act} onClick={() => a.onEdit(g)}>
          {t('edit')}
        </button>
        <button
          type="button"
          className={`${styles.act} ${styles.blue}`}
          onClick={() => a.onExport(g)}
        >
          {t('exportOne')}
        </button>
        <button type="button" className={styles.act} onClick={() => a.onChat(g)}>
          {t('chat')}
        </button>
        <button
          type="button"
          className={`${styles.act} ${styles.red}`}
          onClick={() => a.onDelete(g)}
        >
          {t('delete')}
        </button>
      </div>
    </article>
  );
}

/** D-23: lưới thẻ nhóm (mặc định) */
export function GroupGrid({ items, actions }: { items: AdminGroup[]; actions: GroupRowActions }) {
  return (
    <div className={styles.grid}>
      {items.map((g) => (
        <Card key={g.id} g={g} a={actions} />
      ))}
    </div>
  );
}
