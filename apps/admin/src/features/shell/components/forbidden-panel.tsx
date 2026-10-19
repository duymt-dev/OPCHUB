'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import styles from './rbac.module.css';

/** RB-R06: mở URL menu không có quyền → báo 403 nội bộ + về mục đầu tiên được phép */
export function ForbiddenPanel({ home }: { home: string }) {
  const t = useTranslations('common.rbac');
  const router = useRouter();
  return (
    <div className={styles.forbidden} role="alert">
      <h2>{t('forbiddenTitle')}</h2>
      <p>{t('forbiddenBody')}</p>
      <button type="button" className={styles.forbiddenBack} onClick={() => router.replace(home)}>
        {t('forbiddenBack')}
      </button>
    </div>
  );
}
