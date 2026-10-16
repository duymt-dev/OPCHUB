'use client';

import type { ServiceRequest, ServiceRequestState } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import {
  assignRequest,
  exportRequests,
  requestKeys,
  sendRequestComment,
  transitionRequest,
} from '../api';

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
 * Thao tác ghi của tab "Yêu cầu đăng ký" — mọi thao tác gọi API (BE ghi audit_logs, luật 10).
 * Đổi trạng thái gửi kèm `from` để server cập nhật có điều kiện (luật 7).
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

  const move = useMutation({
    mutationFn: (v: { r: ServiceRequest; to: ServiceRequestState }) =>
      transitionRequest(v.r.code, v.r.status, v.to),
    onSuccess: (_d, v) => {
      toast(t('toast.moved', { code: v.r.code, label: t(`status.${v.to}`) }));
      refresh();
    },
    onError: fail,
  });

  const assign = useMutation({
    mutationFn: (v: { code: string; who: string | null }) => assignRequest(v.code, v.who),
    onSuccess: (_d, v) => {
      toast(v.who ? t('toast.assigned', { name: v.who }) : t('toast.unassigned'));
      refresh();
    },
    onError: fail,
  });

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
    move: (r: ServiceRequest, to: ServiceRequestState) => move.mutate({ r, to }),
    assign: (code: string, who: string | null) => assign.mutate({ code, who }),
    comment: (code: string, body: string, mentions: string[]) =>
      comment.mutateAsync({ code, body, mentions }),
    exportCsv: () => exporting.mutate(),
    toast,
  };
}
