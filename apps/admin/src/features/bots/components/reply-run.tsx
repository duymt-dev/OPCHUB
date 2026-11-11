'use client';

import type { BotReplyRun } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import styles from './reply-panel.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function ReplyRun({ run }: { run: BotReplyRun | null }) {
  const numberText = useNumberText();
  const t = useTranslations('bots.replies');
  if (!run) return null;
  return (
    <div className={styles.run} role="status">
      <span>
        {t(`run.${run.status}`, {
          group: run.groupName,
          processed: numberText(run.processed),
          total: numberText(run.total),
          posted: numberText(run.posted),
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
