'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ConfirmRequest } from '../components/confirm-dialog';
import type { AdminGroup } from '../types';
import { useDeleteGroups } from './use-groups';

/** Xóa nhóm luôn qua hộp xác nhận (D-32); API ghi audit_logs cho từng nhóm */
export function useGroupDelete() {
  const t = useTranslations('groups');
  const toast = useToast();
  const del = useDeleteGroups();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const remove = (list: AdminGroup[], done?: () => void) => {
    const one = list.length === 1 ? list[0] : undefined;
    if (!list.length) return;
    setConfirm({
      title: t('confirm.deleteTitle'),
      body: one
        ? t('confirm.deleteOne', { name: one.name })
        : t('confirm.deleteMany', { count: list.length }),
      okLabel: t('confirm.delete'),
      onOk: () =>
        del.mutate(
          list.map((g) => g.id),
          {
            onSuccess: () => {
              setConfirm(null);
              done?.();
              toast(
                one
                  ? t('toast.deleted', { name: one.name })
                  : t('toast.deletedMany', { count: list.length }),
              );
            },
          },
        ),
    });
  };

  return { confirm, setConfirm, remove, busy: del.isPending };
}
