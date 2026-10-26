'use client';

import type { AdminService, ServiceRequest } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { RequestComments } from './request-comments';
import { RequestInfo } from './request-info';
import styles from './request-drawer.module.css';

interface Props {
  r: ServiceRequest;
  svc: AdminService | undefined;
  onClose: () => void;
}

/**
 * D-63 "Yêu cầu YC-xxxx" 480px. Tự vẽ role=dialog (không motion antd). D-72: chỉ thông tin
 * phiếu + "Trao đổi nội bộ" (ghi chú gắn tên) — không trạng thái, không phụ trách.
 */
export function RequestDrawer({ r, svc, onClose }: Props) {
  const d = useTranslations('requests.drawer');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.mask}>
      <button type="button" aria-label={d('close')} className={styles.backdrop} onClick={onClose} />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="rq-title">
        <div className={styles.head}>
          <span id="rq-title" className={styles.title}>
            {d('title', { code: r.code })}
          </span>
          <button type="button" aria-label={d('close')} className={styles.x} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>
          <RequestInfo r={r} svc={svc} />
          <RequestComments code={r.code} />
        </div>
      </aside>
    </div>
  );
}
