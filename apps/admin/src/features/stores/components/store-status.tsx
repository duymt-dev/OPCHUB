'use client';

import type { StoreStatus } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { STATUS_TONE } from '../model';
import styles from './stores.module.css';

/** Thẻ trạng thái prototype `SL`: Đang hiển thị / Bản nháp / Admin đã ẩn */
export function StoreStatusTag({ status }: { status: StoreStatus }) {
  const t = useTranslations('stores.status');
  const c = STATUS_TONE[status];
  return (
    <span
      className={styles.tag}
      style={{ background: c.bg, color: c.fg, borderColor: c.bd }}
      data-status={status}
    >
      {t(status)}
    </span>
  );
}

/** Ảnh bìa nhỏ, chưa có ảnh → chữ viết tắt */
export function StoreThumb({ url, initials }: { url: string | null; initials: string }) {
  return (
    <span className={styles.thumb}>
      {url ? (
        <span className={styles.thumbImg} style={{ backgroundImage: `url('${url}')` }} />
      ) : (
        initials
      )}
    </span>
  );
}
