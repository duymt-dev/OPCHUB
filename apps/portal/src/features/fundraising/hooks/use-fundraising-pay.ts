'use client';

import { useToast } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { confirmFundraising, fundraisingKeys, startFundraising } from '../api';

/**
 * Lấy (hoặc tạo) khoản chờ thanh toán của dự án đang chọn — POST idempotent (cùng dự án trả cùng
 * mã CK) nên đọc như query. "Tôi đã chuyển khoản" chỉ ghi nhận (D-31; prototype đóng popup + toast
 * ngay) — trạng thái đổi khi webhook ngân hàng về.
 */
export function useFundraisingPay(projectId: string | null, onDone: () => void) {
  const t = useTranslations('projects.fundPlan');
  const failed = useTranslations('projects.toast')('failed');
  const toast = useToast();
  const qc = useQueryClient();
  const [key] = useState(() => crypto.randomUUID());

  const pay = useQuery({
    queryKey: [...fundraisingKeys.mine, 'pay', projectId],
    queryFn: () => startFundraising(projectId ?? ''),
    enabled: !!projectId,
    retry: false,
    staleTime: Infinity,
  });

  const confirm = useMutation({
    mutationFn: (id: string) => confirmFundraising(id, key),
    onSuccess: () => {
      toast(t('recorded'));
      void qc.invalidateQueries({ queryKey: fundraisingKeys.mine });
      void qc.invalidateQueries({ queryKey: ['projects'] });
      onDone();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : failed),
  });

  const error = pay.error ? (pay.error instanceof ApiError ? pay.error.message : failed) : null;
  return { pay: pay.data ?? null, error, loading: pay.isFetching, confirm };
}
