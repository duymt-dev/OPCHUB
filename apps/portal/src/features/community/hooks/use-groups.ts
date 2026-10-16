'use client';

import type { JoinResult } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import { fetchGroups, groupKeys, joinGroup, leaveGroup } from '../api';
import { toCommunityGroups } from '../model';

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: fetchGroups,
    select: (page) => toCommunityGroups(page.items),
  });
}

/** Ghi kết quả join/leave vào cache danh sách (không tải lại 34 nhóm) */
function useApplyStatus() {
  const qc = useQueryClient();
  return (r: JoinResult) => {
    qc.setQueryData<Awaited<ReturnType<typeof fetchGroups>>>(groupKeys.list(), (old) =>
      old
        ? {
            ...old,
            items: old.items.map((g) => (g.id === r.groupId ? { ...g, myStatus: r.status } : g)),
          }
        : old,
    );
  };
}

function useErrorToast() {
  const toast = useToast();
  const t = useTranslations('community.toast');
  return (e: unknown) => toast(e instanceof ApiError ? e.message : t('failed'));
}

export function useJoinGroup() {
  const apply = useApplyStatus();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, intro }: { id: string; intro?: string }) => joinGroup(id, intro),
    onSuccess: apply,
    onError,
  });
}

export function useLeaveGroup() {
  const apply = useApplyStatus();
  const onError = useErrorToast();
  return useMutation({ mutationFn: leaveGroup, onSuccess: apply, onError });
}
