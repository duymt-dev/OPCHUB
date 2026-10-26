'use client';

import type { NeedCreateInput } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import { createNeed, deleteNeed, needKeys, stepNeed } from '../api';

/**
 * Đăng / Đóng / Mở lại / Xoá (UP-09). Trạng thái do server chuyển (luật 7); xong thì nạp lại
 * "Nhu cầu của tôi" + danh sách, và "Đang cần" / badge của gian hàng (khoá `stores`).
 */
export function useNeedActions() {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('needs.toast');
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: needKeys.all });
    void qc.invalidateQueries({ queryKey: ['stores'], refetchType: 'none' });
  };
  const onError = (e: unknown) => toast(messageOf(e, t('failed')));

  const create = useMutation({
    mutationFn: (body: NeedCreateInput) => createNeed(body),
    onSuccess: () => {
      refresh();
      toast(t('posted'));
    },
    onError,
  });
  const step = useMutation({
    mutationFn: (v: { id: string; action: 'close' | 'reopen' }) => stepNeed(v.id, v.action),
    onSuccess: (_n, v) => {
      refresh();
      toast(t(v.action === 'close' ? 'closed' : 'reopened'));
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteNeed(id),
    onSuccess: () => {
      refresh();
      toast(t('deleted'));
    },
    onError,
  });

  return {
    busy: create.isPending || step.isPending || remove.isPending,
    create: (body: NeedCreateInput, onDone: () => void) =>
      create.mutate(body, { onSuccess: onDone }),
    close: (id: string) => step.mutate({ id, action: 'close' }),
    reopen: (id: string) => step.mutate({ id, action: 'reopen' }),
    remove: (id: string) => remove.mutate(id),
  };
}
