'use client';

import type { BotReplyRun } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import styles from './reply-panel.module.css';

export function ReplyRun({
  run,
  disabled,
  onStop,
}: {
  run: BotReplyRun | null;
  disabled: boolean;
  onStop: (id: string) => void;
}) {
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
      {run.status === 'running' ? (
        <button
          className={styles.stop}
          type="button"
          disabled={disabled}
          onClick={() => onStop(run.id)}
        >
          {t('stop')}
        </button>
      ) : null}
    </div>
  );
}
