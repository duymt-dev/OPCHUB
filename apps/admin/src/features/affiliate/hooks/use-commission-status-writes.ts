'use client';

import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import { affiliateKeys, cancelCommissions, restoreCommissions } from '../api';
import { useAffiliateAccess } from './use-affiliate-access';

/** Hủy / khôi phục khoản hoa hồng (D-110: Đã hủy → Đã ghi nhận); kiểm quyền tại ranh giới mutation. */
export function useCommissionStatusWrites() {
  const access = useAffiliateAccess();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('affiliate');
  const fail = (error: unknown) => toast(messageOf(error, t('error')));
  const refresh = () => qc.invalidateQueries({ queryKey: affiliateKeys.all });
  const cancel = useMutation({
    mutationFn: async (body: { ids: string[]; reason: string }) => {
      if (!access.guard('affiliate.action')) return null;
      return cancelCommissions(body.ids, body.reason);
    },
    onSuccess: async (result) => {
      if (!result) return;
      toast(t('toast.cancelled', { n: result.cancelled }));
      await refresh();
    },
    onError: fail,
  });
  const restore = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!access.guard('affiliate.action')) return null;
      return restoreCommissions(ids);
    },
    onSuccess: async (result) => {
      if (!result) return;
      toast(t('toast.restored', { n: result.restored }));
      await refresh();
    },
    onError: fail,
  });
  return { cancel, restore };
}
