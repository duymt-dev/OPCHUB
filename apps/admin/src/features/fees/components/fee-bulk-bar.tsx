'use client';

import { useTranslations } from 'next-intl';
import styles from './fee-table.module.css';

interface Props {
  count: number;
  onCollect: () => void;
  onRemind: () => void;
  onCsv: () => void;
  onClear: () => void;
}

/**
 * "Đã chọn N thành viên" + Ghi nhận đã thu / Gửi nhắc / Xuất CSV / Bỏ chọn.
 * Không dùng `BulkBar` của packages/ui: prototype màn Phí bố cục khác (chữ co giãn, nút liền kề).
 */
export function FeeBulkBar({ count, onCollect, onRemind, onCsv, onClear }: Props) {
  const t = useTranslations('fees.bulk');
  if (count <= 0) return null;
  return (
    <section className={styles.bulk} aria-label={t('label')}>
      <span className={styles.bulkText} aria-live="polite">
        {t('selected')} <b>{count}</b> {t('unit')}
      </span>
      <button type="button" className={`${styles.bulkBtn} ${styles.primary}`} onClick={onCollect}>
        {t('collect')}
      </button>
      <button type="button" className={`${styles.bulkBtn} ${styles.link}`} onClick={onRemind}>
        {t('remind')}
      </button>
      <button type="button" className={styles.bulkBtn} onClick={onCsv}>
        {t('csv')}
      </button>
      <button type="button" className={styles.clear} onClick={onClear}>
        {t('clear')}
      </button>
    </section>
  );
}
