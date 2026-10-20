'use client';

import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useAffiliateWrites } from '../hooks/use-affiliate-writes';
import type { AffiliateParams } from '../types';
import styles from './affiliate.module.css';

/** Export all matching rows; the bulk bar separately exports only selected IDs. */
export function AffiliateExportButton({ params }: { params: AffiliateParams }) {
  const t = useTranslations('affiliate');
  const { csv } = useAffiliateWrites();
  return (
    <Button
      className={styles.export ?? ''}
      aria-label={`${t('export')} · ${t('status.all')}`}
      loading={csv.isPending}
      onClick={() =>
        csv.mutate({
          type: params.tab === 'aff' ? 'aff' : 'com',
          ...(params.q ? { q: params.q } : {}),
          ...(params.tab === 'com' ? { status: params.status } : {}),
        })
      }
    >
      {t('export')}
    </Button>
  );
}
