'use client';

import type { BotBulkBatch, BotBulkSelection } from '@opchub/shared/api-domains';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useCan } from '@/lib/permissions';
import { botKeys } from '../api';
import {
  botBulkKeys,
  createBotBulk,
  retryBotBulk,
  saveBotBulk,
  selectBotBulkItems,
} from '../bulk-api';
import { bulkRequestReplay, type BotBulkInput } from '../bulk/request-replay';

type Action =
  | { kind: 'create'; input: BotBulkInput }
  | { kind: 'select'; id: string; input: BotBulkSelection }
  | { kind: 'retry'; id: string }
  | { kind: 'save'; id: string };

export function useBotBulkActions() {
  const allowed = useCan('bots.action');
  const client = useQueryClient();
  const locked = useRef(false);
  const replay = useRef(bulkRequestReplay());
  const mutation = useMutation({
    mutationKey: [...botBulkKeys.all, 'write'],
    scope: { id: 'bot-control' },
    retry: false,
    mutationFn: async (action: Action) => {
      if (!allowed) return;
      if (action.kind === 'create') {
        const input = replay.current.prepare(action.input);
        const batch = await createBotBulk(input);
        replay.current.acknowledge(input.requestId);
        client.setQueryData(botBulkKeys.latest(), { batch });
      } else if (action.kind === 'save') await saveBotBulk(action.id);
      else {
        const batch =
          action.kind === 'retry'
            ? await retryBotBulk(action.id)
            : await selectBotBulkItems(action.id, action.input);
        // Do not replace a newer draft if another tab has admitted one in the meantime.
        client.setQueryData<{ batch: BotBulkBatch | null }>(botBulkKeys.latest(), (current) =>
          current?.batch?.id === batch.id ? { batch } : current,
        );
      }
    },
    onSettled: (_data, _error, action) =>
      Promise.all([
        client.invalidateQueries({ queryKey: botBulkKeys.latest() }),
        ...(action.kind === 'create'
          ? []
          : [client.invalidateQueries({ queryKey: botBulkKeys.items(action.id) })]),
        ...(action.kind === 'save'
          ? [
              client.invalidateQueries({ queryKey: botKeys.scripts() }),
              client.invalidateQueries({ queryKey: botKeys.activity() }),
            ]
          : []),
      ]),
  });
  const execute = async (action: Action) => {
    if (!allowed || locked.current) return false;
    locked.current = true;
    try {
      await mutation.mutateAsync(action);
      return true;
    } catch {
      return false; // Retain inline error and same-intent replay token for an explicit retry.
    } finally {
      locked.current = false;
    }
  };
  return {
    allowed,
    busy: mutation.isPending,
    error: mutation.error,
    create: (input: BotBulkInput) => execute({ kind: 'create', input }),
    select: (id: string, input: BotBulkSelection) => execute({ kind: 'select', id, input }),
    retry: (id: string) => execute({ kind: 'retry', id }),
    save: (id: string) => execute({ kind: 'save', id }),
  };
}
