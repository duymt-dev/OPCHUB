'use client';

import { useToast } from '@opchub/ui';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import { ApiError } from '@/lib/api-client';
import {
  appointDirector,
  directorKeys,
  fetchDirectorHistory,
  fetchDirectors,
  revokeDirector,
  updateDirector,
} from '../regional-directors-api';
import type { DirectorCommand } from '../types';
import { useAffiliateAccess } from './use-affiliate-access';

export function useRegionalDirectors() {
  const access = useAffiliateAccess();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('affiliate.directors');
  const config = useQuery({
    queryKey: directorKeys.config,
    queryFn: fetchDirectors,
    enabled: access.view,
  });
  const history = useInfiniteQuery({
    queryKey: directorKeys.history,
    initialPageParam: null as { at: string; id: string } | null,
    queryFn: ({ pageParam }) => fetchDirectorHistory(pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: access.view,
  });
  const write = useMutation({
    onMutate: () => qc.cancelQueries({ queryKey: directorKeys.config }),
    mutationFn: async (command: DirectorCommand) => {
      if (!access.guard('affiliate.gdv')) return null;
      if (command.kind === 'appoint') return appointDirector(command.body);
      if (command.kind === 'save') return updateDirector(command.region, command.body);
      return revokeDirector(command.region, command.version);
    },
    onSuccess: async (result) => {
      if (!result) return;
      qc.setQueryData(directorKeys.config, result);
      toast(t('saved'));
      await Promise.all([
        qc.invalidateQueries({ queryKey: directorKeys.history }),
        qc.invalidateQueries({ queryKey: [...directorKeys.all, 'members'] }),
        qc.invalidateQueries({ queryKey: ['admin-fees'] }),
        qc.invalidateQueries({ queryKey: ['admin-members'] }),
      ]);
    },
    onError: (error) => {
      toast(messageOf(error, t('error')));
      if (error instanceof ApiError && error.status === 409)
        void qc.invalidateQueries({ queryKey: directorKeys.config });
    },
  });
  return { config, history, write, canManage: access.director };
}
