'use client';

import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import { exportRequests, requestKeys, sendRequestComment } from '../api';

/** Tải file CSV server dựng về máy */
function download(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Thao tác ghi của tab "Yêu cầu đăng ký" — ghi chú nội bộ + xuất CSV (BE ghi audit_logs, luật 10).
 * D-72: không đổi trạng thái, không giao phụ trách.
 */
export function useRequestActions() {
  const t = useTranslations('requests');
  const toast = useToast();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: requestKeys.all });
  const fail = (e: unknown) => {
    toast(e instanceof ApiError ? e.message : t('toast.failed'));
    refresh();
  };

  const comment = useMutation({
    mutationFn: (v: { code: string; body: string; mentions: string[] }) =>
      sendRequestComment(v.code, v.body, v.mentions),
    onSuccess: (_d, v) => {
      toast(
        v.mentions.length
          ? t('toast.notified', { names: v.mentions.join(', ') })
          : t('toast.commented'),
      );
      void qc.invalidateQueries({ queryKey: requestKeys.comments(v.code) });
    },
    onError: fail,
  });

  const exporting = useMutation({
    mutationFn: exportRequests,
    onSuccess: (d) => {
      download(d.filename, d.csv);
      toast(t('toast.exported', { n: d.csv.split('\n').slice(1).filter(Boolean).length }));
    },
    onError: fail,
  });

  return {
    comment: (code: string, body: string, mentions: string[]) =>
      comment.mutateAsync({ code, body, mentions }),
    exportCsv: () => exporting.mutate(),
    toast,
  };
}
