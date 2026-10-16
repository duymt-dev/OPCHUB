'use client';

import { BulkBar } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import styles from './member-bulk-bar.module.css';

interface Props {
  count: number;
  canEdit: boolean;
  onAssign: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onExport: () => void;
  onClear: () => void;
}

/** D-10 "Đã chọn N mục" + Gán vào nhóm / Khóa / Mở khóa / Xuất CSV / Bỏ chọn */
export function MemberBulkBar(p: Props) {
  const t = useTranslations('members.bulk');
  return (
    <BulkBar
      count={p.count}
      unit={t('unit')}
      selectedLabel={t('selected')}
      clearLabel={t('clear')}
      onClear={p.onClear}
      actions={
        <>
          {p.canEdit ? (
            <>
              <button type="button" className={styles.primary} onClick={p.onAssign}>
                {t('assign')}
              </button>
              <button type="button" className={`${styles.btn} ${styles.danger}`} onClick={p.onLock}>
                {t('lock')}
              </button>
              <button type="button" className={styles.btn} onClick={p.onUnlock}>
                {t('unlock')}
              </button>
            </>
          ) : null}
          <button type="button" className={styles.btn} onClick={p.onExport}>
            {t('export')}
          </button>
        </>
      }
    />
  );
}
