'use client';

import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useBotReplies } from '../hooks/use-bot-replies';
import { ReplyControls } from './reply-controls';
import { ReplyGroups } from './reply-groups';
import { ReplyHistory } from './reply-history';
import styles from './reply-panel.module.css';

export function ReplyPanel({ groupCount }: { groupCount: number }) {
  const t = useTranslations('bots.replies');
  const control = useBotReplies();
  if (control.query.isError)
    return <ErrorState title={t('loadError')} onRetry={() => void control.query.refetch()} />;
  const data = control.query.data;
  if (!data) return <PageSkeleton />;
  return (
    <div className={styles.stack}>
      <ReplyControls
        data={data}
        groupCount={groupCount}
        disabled={!control.allowed || control.busy}
        error={control.error}
        fields={control.fields}
        onPatch={control.patch}
        onScan={control.scan}
        onStop={control.stop}
      />
      <ReplyGroups data={data} />
      <ReplyHistory history={data.history} />
    </div>
  );
}
