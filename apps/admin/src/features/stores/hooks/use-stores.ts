'use client';

import { useToast } from '@opchub/ui';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import { featureStore, fetchStore, fetchStores, moderateStores, storeKeys } from '../api';
import type { StoreParams } from '../types';
import { useNumberText } from '@/i18n/use-number-text';

export function useStores(params: StoreParams) {
  return useQuery({
    queryKey: storeKeys.list(params),
    queryFn: () => fetchStores(params),
    placeholderData: keepPreviousData,
  });
}

export function useStoreDetail(id: string | null) {
  return useQuery({
    queryKey: storeKeys.detail(id ?? ''),
    queryFn: () => fetchStore(id ?? ''),
    enabled: !!id,
  });
}

/** Ẩn / Hiển thị (đơn lẻ, hàng loạt) — BE ghi audit_logs từng gian hàng (luật 10) */
export function useStoreModeration(onDone: () => void) {
  const numberText = useNumberText();
  const t = useTranslations('stores.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: ({ action, ids }: { action: 'hide' | 'show'; ids: string[] }) =>
      moderateStores(action, ids),
    onSuccess: (_d, v) => {
      // Prototype đếm theo số gian hàng được chọn ("Đã ẩn N gian hàng")
      toast(t(v.action === 'hide' ? 'hidden' : 'shown', { n: numberText(v.ids.length) }));
      onDone();
      void qc.invalidateQueries({ queryKey: storeKeys.all });
    },
    onError: (e) => toast(messageOf(e, t('failed'))),
  });
  return {
    hide: (ids: string[]) => m.mutate({ action: 'hide', ids }),
    show: (ids: string[]) => m.mutate({ action: 'show', ids }),
  };
}

/** D-89 (P-105): gắn / gỡ "Nổi bật" — BE ghi audit_logs */
export function useStoreFeature() {
  const t = useTranslations('stores.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => featureStore(id, on),
    onSuccess: (x) => {
      qc.setQueryData(storeKeys.detail(x.id), x);
      toast(t(x.featured ? 'featured' : 'unfeatured', { name: x.name }));
      void qc.invalidateQueries({ queryKey: storeKeys.all });
    },
    onError: (e) => toast(messageOf(e, t('failed'))),
  });
  return (id: string, on: boolean) => m.mutate({ id, on });
}
