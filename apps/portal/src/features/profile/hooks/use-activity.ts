'use client';

import type { JoinResult } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { fetchEvents, fetchGroups, leaveGroup, profileKeys } from '../api';
import { activityEvents, activityGroups } from '../model';
import type { ActivityGroup } from '../types';
import { useErrorToast } from './use-profile';

/** Tab "Nhóm & hoạt động": nhóm của tôi (tham gia + chờ duyệt) và sự kiện đã đăng ký */
export function useActivity() {
  const groups = useQuery({
    queryKey: profileKeys.groups(),
    queryFn: fetchGroups,
    select: (p) => activityGroups(p.items),
  });
  const events = useQuery({
    queryKey: profileKeys.events(),
    queryFn: fetchEvents,
    select: (p) => activityEvents(p.items),
  });
  return { groups, events };
}

/** Rời nhóm / huỷ yêu cầu → cập nhật cache nhóm + số "Nhóm" trên thẻ hồ sơ */
export function useLeaveGroup() {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('profile.toast');
  const onError = useErrorToast();
  const m = useMutation({ mutationFn: leaveGroup, onError });
  return (g: ActivityGroup) =>
    m.mutate(g.id, {
      onSuccess: (r: JoinResult) => {
        qc.setQueryData<Awaited<ReturnType<typeof fetchGroups>>>(profileKeys.groups(), (old) =>
          old
            ? {
                ...old,
                items: old.items.map((x) =>
                  x.id === r.groupId ? { ...x, myStatus: r.status } : x,
                ),
              }
            : old,
        );
        void qc.invalidateQueries({ queryKey: profileKeys.me() });
        toast(t('left', { name: g.name }));
      },
    });
}
