'use client';

import type { AdminService, ServiceRequest, ServiceRequestState } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useStaff } from '../hooks/use-requests';
import { requestActions, STATUS_TONE, steps } from '../model';
import { RequestComments } from './request-comments';
import { RequestInfo } from './request-info';
import tone from './requests.module.css';
import styles from './request-drawer.module.css';

interface Props {
  r: ServiceRequest;
  svc: AdminService | undefined;
  onClose: () => void;
  onMove: (to: ServiceRequestState) => void;
  onReject: () => void;
  onAssign: (who: string | null) => void;
}

/**
 * D-63 / D-64 "Yêu cầu YC-xxxx" 480px. Tự vẽ role=dialog (không motion antd). Nút chuyển
 * trạng thái chỉ hiện bước hợp lệ theo SRS §8; "Từ chối" hỏi xác nhận (D-32).
 */
export function RequestDrawer({ r, svc, onClose, onMove, onReject, onAssign }: Props) {
  const t = useTranslations('requests');
  const d = useTranslations('requests.drawer');
  const staff = useStaff();
  const can = requestActions(r.status);

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
          <span className={`${styles.tag} ${tone[STATUS_TONE[r.status]]}`}>
            {t(`status.${r.status}`)}
          </span>
          <button type="button" aria-label={d('close')} className={styles.x} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.body}>
          <ol className={styles.steps} aria-label={d('steps')}>
            {steps(r.status).map((p) => (
              <li key={p.status} className={`${styles.step} ${p.on ? styles.stepOn : ''}`}>
                <span className={styles.dot}>{p.n}</span>
                <span className={styles.stepLabel}>{t(`status.${p.status}`)}</span>
              </li>
            ))}
          </ol>
          {r.status === 'lost' ? <div className={styles.lost}>{d('lostNote')}</div> : null}
          <div className={styles.btns}>
            {can.next ? (
              <button
                type="button"
                className={styles.primary}
                onClick={() => can.next && onMove(can.next)}
              >
                {d('next', { label: t(`status.${can.next}`) })}
              </button>
            ) : null}
            {can.canReject ? (
              <button type="button" className={styles.danger} onClick={onReject}>
                {d('reject')}
              </button>
            ) : null}
            {can.canReopen ? (
              <button type="button" className={styles.ghost} onClick={() => onMove('consulting')}>
                {d('reopen')}
              </button>
            ) : null}
          </div>
          <label className={styles.field}>
            {d('assignee')}
            <select
              className={styles.select}
              value={r.assignee ?? ''}
              onChange={(e) => onAssign(e.target.value || null)}
            >
              <option value="">{t('unassigned')}</option>
              {(staff.data ?? [])
                .filter((s) => s.name !== 'Admin OPC Hub')
                .map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <RequestInfo r={r} svc={svc} />
          <RequestComments code={r.code} />
        </div>
      </aside>
    </div>
  );
}
