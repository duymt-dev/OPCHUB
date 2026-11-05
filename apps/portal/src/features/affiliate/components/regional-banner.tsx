'use client';
import { useTranslations } from 'next-intl';
import type { DirectorRegion } from '../types';
import styles from './my-region.module.css';

export function RegionalBanner({
  region,
  name,
  onOpen,
}: {
  region: DirectorRegion;
  name: string;
  onOpen: () => void;
}) {
  const t = useTranslations('affiliate.banner');
  return (
    <div className={styles.banner} role="note">
      <span>
        <b>{t('title', { label: region.label, name })}</b> · {t('description')}
      </span>
      <button type="button" onClick={onOpen}>
        {t('open')}
      </button>
    </div>
  );
}
