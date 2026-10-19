'use client';

import type { AdminEventUpsertInput, EventRegistrant } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import {
  checkIn,
  eventKeys,
  exportRegistrants,
  fetchEvents,
  fetchGroups,
  fetchRegistrants,
  saveEvent,
} from '../api';
import { downloadCsv, toEventViews } from '../model';

export function useAdminEvents() {
  return useQuery({
    queryKey: eventKeys.list(),
    queryFn: fetchEvents,
    select: (page) => toEventViews(page.items),
  });
}

export function useRegistrants(id: string | null) {
  return useQuery({
    queryKey: eventKeys.registrants(id ?? ''),
    queryFn: () => fetchRegistrants(id ?? ''),
    enabled: !!id,
    select: (r) => r.items,
  });
}

export function useGroupOptions(enabled: boolean) {
  return useQuery({
    queryKey: eventKeys.groups(),
    queryFn: fetchGroups,
    enabled,
    staleTime: 5 * 60_000,
    select: (p) => p.items.map((g) => ({ id: g.id, name: g.name })),
  });
}

function useErrorToast(fallback: string) {
  const toast = useToast();
  return (e: unknown) => toast(e instanceof ApiError ? e.message : fallback);
}

/** Lỗi lưu do form xử lý (lỗi tại ô theo `fields` — BUG-022) */
export function useSaveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, id }: { body: AdminEventUpsertInput; id: string | null }) =>
      saveEvent(body, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.list() }),
  });
}

/** Check-in / bỏ check-in (API ghi audit); ghi kết quả trả về thẳng vào cache */
export function useCheckIn(id: string) {
  const qc = useQueryClient();
  const t = useTranslations('events.errors');
  const onError = useErrorToast(t('save'));
  return useMutation({
    mutationFn: (v: { userIds: string[]; attended: boolean }) => checkIn(id, v),
    onSuccess: (r) =>
      qc.setQueryData<{ items: EventRegistrant[] }>(eventKeys.registrants(id), (old) =>
        old ? { ...old, items: r.items } : old,
      ),
    onError,
  });
}

/** Xuất CSV danh sách đăng ký — dữ liệu cá nhân nên đi qua API có audit (luật 10) */
export function useExportRegistrants(id: string) {
  const toast = useToast();
  const t = useTranslations('events.toast');
  const onError = useErrorToast(t('exportError'));
  return useMutation({
    mutationFn: () => exportRegistrants(id),
    onMutate: () => toast(t('exporting')),
    onSuccess: (f) => downloadCsv(f.filename, f.csv),
    onError,
  });
}
