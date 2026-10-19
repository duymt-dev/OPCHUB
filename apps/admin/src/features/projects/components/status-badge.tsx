'use client';

import type { ProjectStatus } from '@opchub/shared';
import { useTranslations } from 'next-intl';
import styles from './status-badge.module.css';

interface BadgeProps {
  status: ProjectStatus;
  featured?: boolean;
  /** Có bản sửa Chờ duyệt (REQ-106) → thêm nhãn "Bản sửa" */
  revision?: boolean;
}

/** Nhãn "Bản sửa" cạnh trạng thái dự án đang hiển thị */
function RevisionTag() {
  const t = useTranslations('projects');
  return <span className={`${styles.tag} ${styles.pending_review}`}>{t('revision')}</span>;
}

/** Nhãn trạng thái dự án (RV của prototype) + ★ khi đang nổi bật */
export function StatusBadge({ status, featured, revision }: BadgeProps) {
  const t = useTranslations('projects');
  return (
    <div className={styles.wrap}>
      <span className={`${styles.tag} ${styles[status] ?? ''}`}>{t(`status.${status}`)}</span>
      {revision ? <RevisionTag /> : null}
      {featured ? (
        <span className={styles.star} title={t('featuredMark')}>
          ★
        </span>
      ) : null}
    </div>
  );
}

export function StatusTag({ status, revision }: { status: ProjectStatus; revision?: boolean }) {
  const t = useTranslations('projects');
  return (
    <>
      <span className={`${styles.tag} ${styles[status] ?? ''}`}>{t(`status.${status}`)}</span>
      {revision ? <RevisionTag /> : null}
    </>
  );
}
