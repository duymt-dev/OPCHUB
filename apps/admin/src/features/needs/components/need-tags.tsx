'use client';

import type { NeedStatus, NeedType } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { NEED_STATUS_TONE, NEED_TONE } from '../model';
import styles from './needs.module.css';

/** Thẻ loại prototype `NT`: Cần mua / Cần đầu ra / … */
export function NeedTypeTag({ type }: { type: NeedType }) {
  const t = useTranslations('needs.type');
  const c = NEED_TONE[type];
  return (
    <span
      className={`${styles.tag} ${styles.typeTag}`}
      style={{ background: c.bg, color: c.fg, borderColor: c.bd }}
      data-type={type}
    >
      {t(type)}
    </span>
  );
}

/** Thẻ trạng thái prototype `NSL`: Đang mở / Đã đóng / Admin đã ẩn */
export function NeedStatusTag({ status }: { status: NeedStatus }) {
  const t = useTranslations('needs.status');
  const c = NEED_STATUS_TONE[status];
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
