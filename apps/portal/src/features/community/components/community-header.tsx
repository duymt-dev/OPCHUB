'use client';

import { Icon, PageHeader } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import styles from './community.module.css';

/** Tiêu đề trang (nằm ngoài khối màn, như pageTitle/pageSub của prototype) */
export function CommunityPageHeader() {
  const t = useTranslations('community.page');
  return (
    <PageHeader
      title={t('title')}
      subtitle={t('sub')}
      extra={
        <div className={styles.dateRange}>
          <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
          {t('dateRange')}
          <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
        </div>
      }
    />
  );
}

interface Props {
  joined: number;
  total: number;
}

/** Khối "Khám phá cộng đồng" với ô thống kê (D-71: bỏ ô "chờ duyệt") */
export function CommunityIntro({ joined, total }: Props) {
  const t = useTranslations('community');
  return (
    <div className={styles.intro}>
      <div className={styles.introText}>
        <h2 className={styles.heading}>{t('page.heading')}</h2>
        <div className={styles.lead}>{t('page.lead')}</div>
      </div>
      <div className={styles.stats}>
        <div className={`${styles.stat} ${styles.statJoined}`}>
          <b>{joined}</b>
          <span>{t('stats.joined')}</span>
        </div>
        <div className={styles.stat}>
          <b>{total}</b>
          <span>{t('stats.total')}</span>
        </div>
      </div>
    </div>
  );
}
