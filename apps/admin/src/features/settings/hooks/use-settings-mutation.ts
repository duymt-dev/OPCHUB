'use client';

import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';

/**
 * Mutation chung của màn Cài đặt: gọi API (BE ghi audit_logs — luật 10), cập nhật cache theo
 * kết quả, làm mới nhật ký hoạt động, toast lỗi theo thông điệp của server.
 */
export function useSettingsMutation<V, R>(opts: {
  key: QueryKey;
  fn: (v: V) => Promise<R>;
  /** Ghi thẳng kết quả vào cache `key` (bỏ qua nếu kết quả không cùng dạng) */
  write?: boolean;
  onDone?: (r: R, v: V) => void;
}) {
  const t = useTranslations('settings.common');
  const toast = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: opts.fn,
    onSuccess: (r, v) => {
      if (opts.write) qc.setQueryData(opts.key, r);
      else void qc.invalidateQueries({ queryKey: opts.key });
      void qc.invalidateQueries({ queryKey: ['admin-settings', 'log'] });
      opts.onDone?.(r, v);
    },
    onError: (e) => {
      toast(e instanceof ApiError ? e.message : t('failed'));
      void qc.invalidateQueries({ queryKey: opts.key });
    },
  });
}
