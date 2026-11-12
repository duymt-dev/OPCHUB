'use client';

import type { AdminService, ServiceRequest } from '@opchub/shared/api-domains';
import { useLocale, useTranslations } from 'next-intl';
import { vnDate } from '../model';
import styles from './request-table.module.css';

const COLS = ['code', 'contact', 'service', 'province', 'date'] as const;

interface Props {
  rows: ServiceRequest[];
  services: Map<string, AdminService>;
  onOpen: (r: ServiceRequest) => void;
}

/** Bảng lưới tự vẽ như prototype (`data-m="tbl"`), cuộn ngang ở màn hẹp */
export function RequestTable({ rows, services, onOpen }: Props) {
  const locale = useLocale();
  const t = useTranslations('requests');
  return (
    <div data-m="tbl" className={styles.tbl}>
      <div className={styles.inner} role="table">
        <div className={`${styles.grid} ${styles.headRow}`} role="row">
          {COLS.map((c) => (
            <span key={c} className={styles.th} role="columnheader">
              {t(`col.${c}`)}
            </span>
          ))}
          <span className={styles.th} role="columnheader" />
        </div>
        {rows.map((r) => {
          const svc = services.get(r.serviceId);
          return (
            <div key={r.code} className={`${styles.grid} ${styles.row}`} role="row">
              <b className={styles.code} role="cell">
                {r.code}
              </b>
              <div className={styles.stack} role="cell">
                <b className={styles.name}>{r.fullName}</b>
                <span className={styles.meta}>
                  {t(`kind.${r.requesterType}`)} · {r.phone}
                </span>
              </div>
              <div className={styles.stack} role="cell">
                <span className={styles.svc}>{svc?.name ?? r.serviceName}</span>
                <span className={styles.meta}>{svc?.model ?? ''}</span>
              </div>
              <span className={styles.td} role="cell">
                {r.address || '—'}
              </span>
              <span className={`${styles.td} ${styles.muted}`} role="cell">
                {vnDate(r.createdAt, locale)}
              </span>
              <div className={styles.actions} role="cell">
                <button type="button" className={styles.link} onClick={() => onOpen(r)}>
                  {t('detail')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
