'use client';

import type { NeedMatchRow as MatchRow } from '@opchub/shared/api-domains';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import styles from './need-matches.module.css';

export function NeedMatchRow({ row }: { row: MatchRow }) {
  const t = useTranslations('dashboard.matches');
  const types = useTranslations('needs.type');
  const router = useRouter();
  return (
    <div className={styles.row} data-match-id={row.id}>
      <div className={styles.body}>
        <div className={styles.headline}>
          <span className={styles.type}>{types(row.type)}</span>
          <span className={styles.title} title={row.title}>
            {row.title}
          </span>
        </div>
        <div className={styles.details}>
          <span className={styles.location}>
            {[row.field, row.province].filter(Boolean).join(' · ')}
          </span>
          {row.reasons.map((reason) => (
            <span key={reason} className={styles.reason}>
              {t(`reason.${reason}`)}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.score}>
        <b>{row.pct}%</b>
        <span>{t('fit')}</span>
      </div>
      <Button
        type="primary"
        className={styles.action ?? ''}
        onClick={() => router.push(`/needs?q=${encodeURIComponent(row.title)}`)}
      >
        {t('view')}
      </Button>
    </div>
  );
}
