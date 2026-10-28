'use client';

import type { BotReplyOverview } from '@opchub/shared/api-domains';
import { useFormatter, useTranslations } from 'next-intl';
import styles from './reply-panel.module.css';

export function ReplyGroups({ data }: { data: BotReplyOverview }) {
  const t = useTranslations('bots.replies');
  const format = useFormatter();
  const next = data.groups.find((row) => row.personaCount > 0);
  return (
    <>
      <section className={styles.box} aria-label={t('groups')}>
        <header className={styles.sectionHead}>
          <h3>{t('groups')}</h3>
          <span>{t('pending', { n: data.pendingTotal, groups: data.groupCount })}</span>
        </header>
        {data.groups.length ? (
          data.groups.map((row) => (
            <div className={styles.row} key={row.groupId}>
              <span>{row.groupName}</span>
              <div className={styles.rank}>
                {row.groupId === data.run?.groupId && data.run.status === 'running' ? (
                  <span className={`${styles.badge} ${styles.activeBadge}`}>{t('replying')}</span>
                ) : row.groupId === next?.groupId ? (
                  <span className={styles.badge}>{t('priority')}</span>
                ) : null}
                {!row.personaCount ? <span>{t('noPersona')}</span> : null}
                <span>{t('waiting', { n: row.pending })}</span>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.empty}>{t('noPending')}</p>
        )}
      </section>
      {next ? (
        <section className={styles.box} aria-label={t('preview')}>
          <header className={styles.sectionHead}>
            <h3>
              {t('next', {
                group: next.groupName,
                n: next.pending,
                sample: data.settings.sampleSize,
              })}
            </h3>
            <span>{t('personas', { n: next.personaCount })}</span>
          </header>
          {next.preview.map((row) => (
            <div className={`${styles.message} ${styles.previewRow}`} key={row.id}>
              <div className={styles.source}>
                <div>
                  <b>{row.senderName}</b>
                  <span className={styles.time}>
                    {' '}
                    ·{' '}
                    {format.dateTime(new Date(row.createdAt), {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </span>
                </div>
                <p>{row.body}</p>
              </div>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
              <span className={styles.assignment}>{t('assignmentPending')}</span>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
