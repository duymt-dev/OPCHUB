'use client';

import type { AdminService, ServiceRequest } from '@opchub/shared/api-domains';
import { SafeHtml } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { extraRows, vnDate } from '../model';
import styles from './request-drawer.module.css';

/** Bảng thông tin phiếu, "Mô tả yêu cầu", thông tin thêm theo đối tượng */
export function RequestInfo({ r, svc }: { r: ServiceRequest; svc: AdminService | undefined }) {
  const t = useTranslations('requests');
  const d = useTranslations('requests.drawer');
  const extra = extraRows(r);
  const info: [string, string][] = [
    [d('service'), `${svc?.name ?? r.serviceName} · ${svc?.model ?? ''}`],
    [d('kind'), t(`kind.${r.requesterType}`)],
    [d('contact'), r.fullName],
    [d('phone'), r.phone],
    [d('email'), r.email],
    [d('org'), `${r.organization} ${r.taxCode}`],
    [d('province'), r.address || '—'],
    [d('date'), vnDate(r.createdAt)],
  ];
  return (
    <>
      <dl className={styles.info}>
        {info.map(([k, v], i) => (
          <div key={k} className={`${styles.infoRow} ${i === info.length - 1 ? styles.last : ''}`}>
            <dt className={styles.k}>{k}</dt>
            <dd className={styles.v}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.note}>
        <span className={styles.h}>{d('note')}</span>
        <SafeHtml html={r.note} className={`rich ${styles.noteText}`} />
      </div>
      {extra.length ? (
        <dl className={`${styles.info} ${styles.extra}`}>
          {extra.map(([k, v]) => (
            <div key={k} className={styles.infoRow}>
              <dt className={styles.k}>{k}</dt>
              <dd className={styles.v}>{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
}
