'use client';

import type { BotSettings } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { messageOf } from '@/lib/api-errors';
import { useCan } from '@/lib/permissions';
import { botKeys, emergencyStop, hideBotMessages } from '../api';
import type { BotEmergencyAction } from '../types';

export const botEmergencyKey = ['bots', 'emergency-write'] as const;

/** Destructive writes are confirmed by the caller, never optimistic or retried. */
export function useBotEmergency() {
  const allowed = useCan('bots.action');
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('bots.emergency');
  const locked = useRef(false);
  const mutation = useMutation({
    mutationKey: botEmergencyKey,
    scope: { id: 'bot-control' },
    retry: false,
    mutationFn: async (action: BotEmergencyAction) => {
      if (!allowed) return null;
      if (action.kind === 'stop') return { kind: 'stop' as const, ...(await emergencyStop()) };
      return { kind: 'hide' as const, ...(await hideBotMessages(action.groupIds)) };
    },
    onSuccess: async (result) => {
      if (!result) return;
      await qc.cancelQueries({ queryKey: botKeys.settings() });
      if (result.kind === 'stop') {
        qc.setQueryData<BotSettings>(botKeys.settings(), (old) =>
          old ? { ...old, enabled: false } : old,
        );
        toast(t('stopped', { n: result.stopped }));
      } else {
        toast(t('hidden', { n: result.hidden, rooms: result.rooms }));
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: botKeys.all }),
        qc.invalidateQueries({ queryKey: ['admin-messages'] }),
      ]);
    },
    onError: (error) => toast(messageOf(error, t('error'))),
  });

  const execute = async (action: BotEmergencyAction): Promise<boolean> => {
    if (!allowed || locked.current) return false;
    locked.current = true;
    try {
      return (await mutation.mutateAsync(action)) !== null;
    } catch {
      // Keep the confirmation open for an explicit retry; onError presents the error.
      return false;
    } finally {
      locked.current = false;
    }
  };
  return { allowed, busy: mutation.isPending, execute };
}
