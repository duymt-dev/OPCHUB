'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CardHandlers } from '../components/community-card';
import type { CommunityGroup } from '../types';
import { useJoinGroup, useLeaveGroup } from './use-groups';

/** Thao tác trên thẻ + popup tham gia, kèm toast như prototype */
export function useCommunityActions() {
  const t = useTranslations('community.toast');
  const toast = useToast();
  const router = useRouter();
  const join = useJoinGroup();
  const leave = useLeaveGroup();
  const [joining, setJoining] = useState<CommunityGroup | null>(null);

  const handlers: CardHandlers = {
    onOpenChat: (g) => router.push(`/chat/${encodeURIComponent(g.id)}`),
    onJoin: setJoining,
    onLeave: (g) => leave.mutate(g.id, { onSuccess: () => toast(t('left', { name: g.name })) }),
    onCancel: (g) => leave.mutate(g.id, { onSuccess: () => toast(t('cancelled')) }),
  };

  const submitJoin = (g: CommunityGroup, intro: string) =>
    join.mutate(
      { id: g.id, ...(intro ? { intro } : {}) },
      {
        onSuccess: (r) => {
          setJoining(null);
          toast(r.status === 'pending' ? t('requested') : t('welcome', { name: g.name }));
        },
      },
    );

  return {
    handlers,
    joining,
    busy: join.isPending,
    closeJoin: () => setJoining(null),
    submitJoin,
    toast,
  };
}
