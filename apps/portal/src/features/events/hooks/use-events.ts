'use client';

import type { EventRegistrationResult } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import { cancelEvent, eventKeys, fetchEvents, registerEvent } from '../api';
import { toEventView } from '../model';
import type { EventView } from '../types';

/** Khóa cache hộp thư của khung app — đăng ký xong server đẩy thông báo nhắc */
const NOTIFICATIONS_KEY = ['notifications'] as const;

export function useEvents() {
  return useQuery({
    queryKey: eventKeys.list(),
    queryFn: fetchEvents,
    select: (page) => page.items.map(toEventView),
  });
}

/** Ghi số chỗ + trạng thái của tôi vào cache (không tải lại danh sách) */
function useApply() {
  const qc = useQueryClient();
  return (r: EventRegistrationResult) =>
    qc.setQueryData<Awaited<ReturnType<typeof fetchEvents>>>(eventKeys.list(), (old) =>
      old
        ? {
            ...old,
            items: old.items.map((e) =>
              e.id === r.eventId
                ? { ...e, registered: r.registered, registeredByMe: r.registeredByMe }
                : e,
            ),
          }
        : old,
    );
}

/** Đăng ký / huỷ đăng ký theo trạng thái hiện tại; "Hết chỗ" không làm gì (như prototype) */
export function useToggleRegistration() {
  const t = useTranslations('events.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const apply = useApply();
  const m = useMutation({
    mutationFn: (e: EventView) => (e.registeredByMe ? cancelEvent(e.id) : registerEvent(e.id)),
    onSuccess: (r) => {
      apply(r);
      toast(r.registeredByMe ? t('registered') : t('cancelled'));
      if (r.registeredByMe) void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('failed')),
  });
  return (e: EventView) => {
    if (e.reg === 'full' || m.isPending) return;
    m.mutate(e);
  };
}
