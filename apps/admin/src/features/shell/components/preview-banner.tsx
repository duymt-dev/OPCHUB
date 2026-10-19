'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import styles from './rbac.module.css';

/** RB-R09: dải cam khi Super Admin đang xem thử theo một vai trò */
export function PreviewBanner() {
  const t = useTranslations('common.rbac');
  const preview = useAuthStore((s) => s.preview);
  const setPreview = useAuthStore((s) => s.setPreview);
  if (!preview) return null;
  return (
    <div className={styles.preview} role="status" data-ro-ok="1">
      <span className={styles.previewText}>
        {t.rich('preview', { role: preview.roleName, b: (c) => <b>{c}</b> })}
      </span>
      <button
        type="button"
        data-ro-ok="1"
        className={styles.previewExit}
        onClick={() => setPreview(null)}
      >
        {t('previewExit')}
      </button>
    </div>
  );
}
