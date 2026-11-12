'use client';

import { COVER_DEFAULT_SRC, groupCoverSrc } from '@opchub/ui';
import { useDomainLabels } from '@/i18n/domain-labels';
import { useLocale, useTranslations } from 'next-intl';
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

/** BUG-011: ảnh bìa `coverUrl` của item; chưa có / lỗi → ảnh mặc định tự host (D-36) */
export function Cover({ g }: { g: AdminGroup }) {
  const onError = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.src.endsWith(COVER_DEFAULT_SRC)) img.src = COVER_DEFAULT_SRC;
  };
  // eslint-disable-next-line @next/next/no-img-element -- Dynamic storage cover keeps the D-36 onError fallback.
  return <img className={styles.img} src={groupCoverSrc(g.coverUrl)} alt="" onError={onError} />;
}

function Card({ g, a }: { g: AdminGroup; a: GroupRowActions }) {
  const locale = useLocale();
  const t = useTranslations('groups.list');
  const labels = useDomainLabels();
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
            <span className={styles.region}>{labels.canonicalRegion(g.region)}</span>
          </div>
        </div>
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <b>{formatCount(g.memberCount, locale)}</b>
            <span>{t('membersLabel')}</span>
          </div>
          <div className={styles.metric}>
            <b>{formatCount(g.weeklyActive, locale)}</b>
            <span>{t('weeklyLabel')}</span>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <button data-act="write" type="button" className={styles.act} onClick={() => a.onEdit(g)}>
          {t('edit')}
        </button>
        <button
          data-act="write"
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
          data-act="write"
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
