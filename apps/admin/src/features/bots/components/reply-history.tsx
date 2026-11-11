'use client';

import type { BotReplyOverview } from '@opchub/shared/api-domains';
import { useLocale, useTranslations } from 'next-intl';
import { formatDate } from '@/i18n/format';
import styles from './reply-panel.module.css';

export function ReplyHistory({ history }: { history: BotReplyOverview['history'] }) {
  const t = useTranslations('bots.replies');
  const locale = useLocale();
  return (
    <section className={styles.box} aria-label={t('history')}>
      <header className={styles.sectionHead}>
        <h3>{t('history')}</h3>
      </header>
      {history.length ? (
        history.slice(0, 20).map((row) => (
          <div className={styles.message} key={row.id}>
            <div>
              <b>{row.personaName}</b>
              <span className={styles.time}>
                {' '}
                · {row.groupName} ·{' '}
                {formatDate(row.createdAt, locale, {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Ho_Chi_Minh',
                })}
              </span>
            </div>
            <p>{row.body}</p>
          </div>
        ))
      ) : (
        <p className={styles.empty}>{t('historyEmpty')}</p>
      )}
    </section>
  );
}
