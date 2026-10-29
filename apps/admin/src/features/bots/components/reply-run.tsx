'use client';

import type { BotReplyRun } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import styles from './reply-panel.module.css';

export function ReplyRun({ run }: { run: BotReplyRun | null }) {
  const t = useTranslations('bots.replies');
  if (!run) return null;
  return (
    <div className={styles.run} role="status">
      <span>
        {t(`run.${run.status}`, {
          group: run.groupName,
          processed: run.processed,
          total: run.total,
          posted: run.posted,
        })}
      </span>
      <progress
        className={styles.progress}
        aria-label={t('progress')}
        value={run.processed}
        max={run.total}
      />
    </div>
  );
}
