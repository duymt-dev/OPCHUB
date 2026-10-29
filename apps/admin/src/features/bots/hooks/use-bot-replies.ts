'use client';

import type { BotReplySettings } from '@opchub/shared/api-domains';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { ApiError } from '@/lib/api-client';
import { messageOf } from '@/lib/api-errors';
import { useCan } from '@/lib/permissions';
import { botKeys } from '../api';
import {
  botReplyKey,
  fetchBotReplies,
  patchBotReplies,
  scanBotReplies,
  stopBotReplies,
} from '../reply-api';

type Action =
  | { kind: 'patch'; patch: Partial<BotReplySettings> }
  | { kind: 'scan' }
  | { kind: 'stop'; id: string };

export function useBotReplies() {
  const allowed = useCan('bots.action');
  const t = useTranslations('bots.replies');
  const client = useQueryClient();
  const locked = useRef(false);
  const query = useQuery({
    queryKey: botReplyKey,
    queryFn: fetchBotReplies,
    refetchInterval: 3000,
  });
  const mutation = useMutation({
    mutationKey: [...botReplyKey, 'write'],
    scope: { id: 'bot-control' },
    retry: false,
    mutationFn: async (action: Action) => {
      if (!allowed) return;
      if (action.kind === 'patch') await patchBotReplies(action.patch);
      else if (action.kind === 'scan') await scanBotReplies();
      else await stopBotReplies(action.id);
    },
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: botReplyKey }),
        client.invalidateQueries({ queryKey: botKeys.settings() }),
        client.invalidateQueries({ queryKey: botKeys.threads() }),
        client.invalidateQueries({ queryKey: botKeys.activity() }),
      ]),
  });
  const execute = async (action: Action) => {
    if (!allowed || locked.current) return;
    locked.current = true;
    try {
      await mutation.mutateAsync(action);
    } catch {
      /* Keep the inline error and allow an explicit retry. */
    } finally {
      locked.current = false;
    }
  };
  return {
    query,
    allowed,
    busy: mutation.isPending,
    error: mutation.error ? messageOf(mutation.error, t('saveError')) : null,
    fields: mutation.error instanceof ApiError ? mutation.error.fields : [],
    patch: (patch: Partial<BotReplySettings>) => void execute({ kind: 'patch', patch }),
    scan: () => void execute({ kind: 'scan' }),
    stop: (id: string) => void execute({ kind: 'stop', id }),
  };
}
