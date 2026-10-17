'use client';

import { UserAvatar } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { fetchAuditLog, settingsKeys } from '../api';
import { useRelTime } from '../hooks/use-rel-time';
import styles from './audit-log.module.css';
import ui from './settings.module.css';

/** D-75 "Nhật ký hoạt động quản trị" — đọc audit_logs 90 ngày gần nhất */
export function AuditLogTab() {
  const t = useTranslations('settings.log');
  const rel = useRelTime();
  const q = useQuery({ queryKey: settingsKeys.log, queryFn: fetchAuditLog });
  const rows = q.data ?? [];

  return (
    <section className={ui.card}>
      <div className={ui.head}>
        <div className={ui.h18}>{t('heading')}</div>
        <div className={ui.muted}>{t('headingSub')}</div>
      </div>
      <ul className={styles.list} aria-label={t('heading')}>
        {rows.map((l) => (
          <li key={l.id} className={styles.row}>
            <UserAvatar name={l.actorName} size={30} src={l.actorAvatarUrl ?? undefined} />
            <div className={styles.what}>
              <b className={styles.who}>{l.actorName}</b> {l.summary}
            </div>
            <span className={`${styles.tag} ${styles[l.tag]}`}>{t(`tag.${l.tag}`)}</span>
            <span className={styles.when}>{rel(l.at)}</span>
          </li>
        ))}
        {q.isSuccess && !rows.length ? <li className={styles.empty}>{t('empty')}</li> : null}
      </ul>
    </section>
  );
}
