'use client';

import type { BotSettings } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useBotSchedule } from '../hooks/use-bot-schedule';
import { AutoPanel } from './auto-panel';

export function AutomationPanel(props: {
  settings: BotSettings;
  todayCount: number;
  onPatch: (patch: Partial<BotSettings>) => void;
  disabled: boolean;
}) {
  const t = useTranslations('bots.schedule');
  const control = useBotSchedule(props.settings);
  if (control.query.isError)
    return <ErrorState title={t('loadError')} onRetry={() => void control.query.refetch()} />;
  if (!control.query.data) return <PageSkeleton />;
  return (
    <AutoPanel
      {...props}
      disabled={props.disabled || control.busy}
      control={{
        ...control.query.data,
        error: control.error,
        fields: control.fields,
        onPatch: control.patch,
        onToggle: control.toggle,
      }}
    />
  );
}
