'use client';
import { useTranslations } from 'next-intl';
import type { AffiliateAdminListRow } from '@opchub/shared/api-domains';
import styles from './affiliate.module.css';
export function AffiliateRegionCell({ region }: { region: AffiliateAdminListRow['region'] }) {
  const t = useTranslations('affiliate');
  return (
    <div>
      <div>
        {region
          ? `${region.directorName ?? t('noDirector')} · ${t(`regionNames.${region.region}`)}`
          : '—'}
      </div>
      <small className={styles.hint}>
        {region ? t('regionManaged', { province: region.provinceName }) : t('noRegion')}
      </small>
    </div>
  );
}
