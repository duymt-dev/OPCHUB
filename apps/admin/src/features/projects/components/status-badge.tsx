'use client';

import type { ProjectStatus } from '@opchub/shared';
import { useTranslations } from 'next-intl';
import styles from './status-badge.module.css';

/** Nhãn trạng thái dự án (RV của prototype) + ★ khi đang nổi bật */
export function StatusBadge({ status, featured }: { status: ProjectStatus; featured?: boolean }) {
  const t = useTranslations('projects');
  return (
    <div className={styles.wrap}>
      <span className={`${styles.tag} ${styles[status] ?? ''}`}>{t(`status.${status}`)}</span>
      {featured ? (
        <span className={styles.star} title={t('featuredMark')}>
          ★
        </span>
      ) : null}
    </div>
  );
}

export function StatusTag({ status }: { status: ProjectStatus }) {
  const t = useTranslations('projects');
  return <span className={`${styles.tag} ${styles[status] ?? ''}`}>{t(`status.${status}`)}</span>;
}
