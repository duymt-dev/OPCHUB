'use client';

import type { AdminService } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import { createService, deleteService, patchService, requestKeys, type ServicePatch } from '../api';

/**
 * Danh mục dịch vụ: sửa ô (lưu khi rời ô), bật/tắt hiển thị, thêm, xoá (xác nhận ở UI).
 * Mọi thao tác gọi API — BE ghi audit_logs (luật 10).
 */
export function useCatalogActions() {
  const t = useTranslations('requests.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: requestKeys.catalog });
  const fail = (e: unknown) => {
    toast(e instanceof ApiError ? e.message : t('failed'));
    refresh();
  };

  const patch = useMutation({
    mutationFn: (v: { id: string; patch: ServicePatch }) => patchService(v.id, v.patch),
    onMutate: (v) =>
      qc.setQueryData<AdminService[]>(requestKeys.catalog, (old) =>
        old?.map((s) => (s.id === v.id ? { ...s, ...v.patch } : s)),
      ),
    onSuccess: refresh,
    onError: fail,
  });
  const add = useMutation({ mutationFn: createService, onSuccess: refresh, onError: fail });
  const remove = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      toast(t('deleted'));
      refresh();
    },
    onError: fail,
  });

  return {
    patch: (id: string, p: ServicePatch) => patch.mutate({ id, patch: p }),
    add: () => add.mutate(),
    remove: (id: string) => remove.mutate(id),
    inUse: () => toast(t('inUse')),
  };
}
