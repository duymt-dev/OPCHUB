'use client';

import type { BotConversationTypeInput } from '@opchub/shared/api-domains';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useCan } from '@/lib/permissions';
import {
  botConversationTypesKey,
  createBotConversationType,
  deleteBotConversationType,
  fetchBotConversationTypes,
} from '../conversation-type-api';

type Action = { kind: 'create'; input: BotConversationTypeInput } | { kind: 'delete'; id: string };

export function useBotConversationTypes() {
  const allowed = useCan('bots.action');
  const client = useQueryClient();
  const locked = useRef(false);
  const query = useInfiniteQuery({
    queryKey: botConversationTypesKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchBotConversationTypes(pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
  });
  const mutation = useMutation({
    mutationKey: [...botConversationTypesKey, 'write'],
    scope: { id: 'bot-control' },
    retry: false,
    mutationFn: async (action: Action) => {
      if (!allowed) return null;
      if (action.kind === 'create') return createBotConversationType(action.input);
      await deleteBotConversationType(action.id);
      return null;
    },
    onSettled: () => client.invalidateQueries({ queryKey: botConversationTypesKey }),
  });
  const execute = async (action: Action) => {
    if (!allowed || locked.current) return { ok: false } as const;
    locked.current = true;
    try {
      const value = await mutation.mutateAsync(action);
      return { ok: true, value } as const;
    } catch {
      return { ok: false } as const;
    } finally {
      locked.current = false;
    }
  };
  return {
    query,
    allowed,
    busy: mutation.isPending,
    error: mutation.error,
    types: [
      ...(query.data?.pages[0]?.builtins ?? []),
      ...(query.data?.pages.flatMap((page) => page.items) ?? []),
    ],
    create: (input: BotConversationTypeInput) => execute({ kind: 'create', input }),
    remove: (id: string) => execute({ kind: 'delete', id }),
  };
}
