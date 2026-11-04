'use client';
import { useTranslations } from 'next-intl';
import styles from './policy-reference.module.css';
export function CommissionReferenceBanner() {
  const t = useTranslations('affiliate');
  return (
    <div role="note" className={styles.banner}>
      {t('referenceBanner')}
    </div>
  );
}
