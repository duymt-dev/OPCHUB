'use client';

import { useTranslations } from 'next-intl';
import { vnDate } from '../model';
import type { AdminProject } from '../types';
import styles from './project-grid.module.css';
import { StatusBadge } from './status-badge';

export interface ProjectRowActions {
  onOpen: (p: AdminProject) => void;
  onDelete: (p: AdminProject) => void;
}

/** Nhãn nút chính theo trạng thái (actLabel của prototype) */
export function useActLabel() {
  const t = useTranslations('projects.act');
  return (p: AdminProject) =>
    p.status === 'pending_review'
      ? t('review')
      : p.status === 'published'
        ? t('detail')
        : t('view');
}

function Card({ p, a }: { p: AdminProject; a: ProjectRowActions }) {
  const t = useTranslations('projects');
  const actLabel = useActLabel();
  return (
    <article className={styles.card}>
      <div className={styles.cover}>
        {/* eslint-disable-next-line @next/next/no-img-element -- D-36: ảnh bìa mẫu, tự host sau */}
        <img className={styles.img} src={p.coverUrl} alt="" />
        <div className={styles.shade} />
        <span className={styles.cat}>{p.category}</span>
      </div>
      <div className={styles.body}>
        <b className={styles.name}>{p.name}</b>
        <span className={styles.meta}>
          {t('updated', { owner: p.ownerName, date: vnDate(p.createdAt) })}
        </span>
        <div className={styles.status}>
          <StatusBadge status={p.status} featured={p.featured} />
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.open} onClick={() => a.onOpen(p)}>
          {actLabel(p)}
        </button>
        <button type="button" className={styles.del} onClick={() => a.onDelete(p)}>
          {t('act.delete')}
        </button>
      </div>
    </article>
  );
}

/** D-51: lưới thẻ dự án (mặc định) */
export function ProjectGrid({
  items,
  actions,
}: {
  items: AdminProject[];
  actions: ProjectRowActions;
}) {
  return (
    <div className={styles.grid}>
      {items.map((p) => (
        <Card key={p.id} p={p} a={actions} />
      ))}
    </div>
  );
}
