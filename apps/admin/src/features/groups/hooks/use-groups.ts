'use client';

import type { GroupAdminUpsertInput } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import {
  deleteGroup,
  fetchGroup,
  fetchGroups,
  fetchMemberCounts,
  fetchPeople,
  groupKeys,
  saveGroup,
} from '../api';
import { toAdminGroups } from '../model';
import type { Person } from '../types';

export function useAdminGroups() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: fetchGroups,
    select: (page) => toAdminGroups(page.items),
  });
}

export function useGroupDetail(id: string | null) {
  return useQuery({
    queryKey: groupKeys.detail(id ?? ''),
    queryFn: () => fetchGroup(id ?? ''),
    enabled: !!id,
  });
}

export function useMemberCounts(enabled: boolean) {
  return useQuery({ queryKey: groupKeys.counts(), queryFn: fetchMemberCounts, enabled });
}

/** Người chọn làm chủ nhóm / điều phối viên (thành viên hệ thống) */
export function usePeople(enabled: boolean) {
  return useQuery({
    queryKey: groupKeys.people(),
    queryFn: fetchPeople,
    enabled,
    staleTime: 5 * 60_000,
    select: (page): Person[] => page.items.map((m) => ({ id: m.id, name: m.fullName })),
  });
}

export function useErrorToast() {
  const toast = useToast();
  const t = useTranslations('groups.toast');
  return (e: unknown) => toast(e instanceof ApiError ? e.message : t('failed'));
}

export function useSaveGroup() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: ({ body, id }: { body: GroupAdminUpsertInput; id: string | null }) =>
      saveGroup(body, id),
    onSuccess: (g) => {
      qc.setQueryData(groupKeys.detail(g.id), g);
      return qc.invalidateQueries({ queryKey: groupKeys.list() });
    },
    onError,
  });
}

/** Xóa một hoặc nhiều nhóm (mỗi nhóm một lệnh DELETE có audit) */
export function useDeleteGroups() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(deleteGroup)),
    onSettled: () => qc.invalidateQueries({ queryKey: groupKeys.list() }),
    onError,
  });
}
