'use client';

import type { BotSchedulePatch, BotSettings } from '@opchub/shared/api-domains';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { ApiError } from '@/lib/api-client';
import { messageOf } from '@/lib/api-errors';
import { useCan } from '@/lib/permissions';
import { botKeys, patchSettings } from '../api';
import { botScheduleKey, fetchBotSchedule, patchBotSchedule } from '../schedule-api';

type Action = { kind: 'patch'; patch: BotSchedulePatch } | { kind: 'toggle' };

export function useBotSchedule(settings: BotSettings) {
  const allowed = useCan('bots.action');
  const t = useTranslations('bots.schedule');
  const client = useQueryClient();
  const locked = useRef(false);
  const query = useQuery({
    queryKey: botScheduleKey,
    queryFn: fetchBotSchedule,
    refetchInterval: 30_000,
  });
  const mutation = useMutation({
    mutationKey: [...botKeys.all, 'schedule-write'],
    scope: { id: 'bot-control' },
    retry: false,
    mutationFn: async (action: Action) => {
      if (!allowed) return null;
      const schedule =
        client.getQueryData<Awaited<ReturnType<typeof fetchBotSchedule>>>(botScheduleKey);
      const current = client.getQueryData<BotSettings>(botKeys.settings()) ?? settings;
      if (!schedule) throw new Error(t('loadError'));
      const patch =
        action.kind === 'patch'
          ? action.patch
          : {
              paused: current.enabled && !schedule.schedule.paused,
            };
      const result = await patchBotSchedule(patch);
      client.setQueryData(botScheduleKey, result);
      // Explicit resume after destructive emergency: clear pause first, then enable.
      // Failure between writes stays disabled; terminal threads are never recreated.
      if (action.kind === 'toggle' && !current.enabled) {
        const enabled = await patchSettings({ enabled: true });
        client.setQueryData(botKeys.settings(), enabled);
      }
      return result;
    },
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: botScheduleKey }),
        client.invalidateQueries({ queryKey: botKeys.settings() }),
        client.invalidateQueries({ queryKey: botKeys.threads() }),
      ]),
  });
  const execute = async (action: Action) => {
    if (!allowed || locked.current) return;
    locked.current = true;
    try {
      await mutation.mutateAsync(action);
    } catch {
      /* Inline mutation error remains retryable. */
    } finally {
      locked.current = false;
    }
  };
  return {
    query,
    busy: mutation.isPending,
    error: mutation.error ? messageOf(mutation.error, t('saveError')) : null,
    fields: mutation.error instanceof ApiError ? mutation.error.fields : [],
    patch: (patch: BotSchedulePatch) => void execute({ kind: 'patch', patch }),
    toggle: () => void execute({ kind: 'toggle' }),
  };
}
