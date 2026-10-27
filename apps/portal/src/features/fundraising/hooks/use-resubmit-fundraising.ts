'use client';

import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { fundraisingKeys, resubmitFundraising } from '../api';

/** D-113 (F6): gửi lại khoản Gọi vốn bị từ chối → chờ Admin thẩm định; làm mới Dự án của tôi */
export function useResubmitFundraising() {
  const t = useTranslations('projects.fundRejected');
  const failed = useTranslations('projects.toast')('failed');
  const toast = useToast();
  const qc = useQueryClient();
  const [key] = useState(() => crypto.randomUUID());
  return useMutation({
    mutationFn: (id: string) => resubmitFundraising(id, key),
    onSuccess: () => {
      toast(t('sent'));
      void qc.invalidateQueries({ queryKey: fundraisingKeys.mine });
      void qc.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : failed),
  });
}
