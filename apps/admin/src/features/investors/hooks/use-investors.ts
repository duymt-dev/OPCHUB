'use client';

import type { InvestorStatus } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import {
  exportInvestors,
  fetchInvestorComments,
  fetchInvestors,
  fetchInvestorSummary,
  investorKeys,
  sendInvestorComment,
  setInvestorStatus,
} from '../api';
import type { InvestorParams } from '../types';

/** Danh sách (phân trang server) + thống kê / số trên tab */
export function useInvestors(params: InvestorParams) {
  const list = useQuery({
    queryKey: investorKeys.list(params),
    queryFn: () => fetchInvestors(params),
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({ queryKey: investorKeys.summary, queryFn: fetchInvestorSummary });
  return { list, summary };
}

export function useInvestorComments(key: string | null) {
  return useQuery({
    queryKey: investorKeys.comments(key ?? ''),
    queryFn: () => fetchInvestorComments(key ?? ''),
    enabled: key !== null,
  });
}

/** Tải file CSV server dựng về máy */
function download(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Thao tác ghi — mọi thao tác gọi API (BE ghi audit_logs, luật 10) */
export function useInvestorActions() {
  const t = useTranslations('investors.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: investorKeys.all });
  /** BUG-024: giữ lý do server (409 hết điều kiện…), lỗi mạng → câu chung */
  const fail = (e: unknown) => toast(messageOf(e, t('failed')));

  const status = useMutation({
    mutationFn: (v: { key: string; name: string; status: InvestorStatus; label: string }) =>
      setInvestorStatus(v.key, v.status),
    onSuccess: (_d, v) => {
      toast(t('status', { name: v.name, label: v.label }));
      refresh();
    },
    onError: fail,
  });

  const comment = useMutation({
    mutationFn: (v: { key: string; name: string; body: string }) =>
      sendInvestorComment(v.key, v.body),
    onSuccess: (_d, v) => {
      toast(t('sent', { name: v.name }));
      refresh();
    },
    onError: fail,
  });

  const exporting = useMutation({
    mutationFn: exportInvestors,
    onSuccess: (d) => {
      download(d.filename, d.csv);
      const n = d.csv.split('\n').slice(1).filter(Boolean).length;
      toast(t('exported', { n }));
    },
    onError: fail,
  });

  return {
    setStatus: (key: string, name: string, s: InvestorStatus, label: string) =>
      status.mutate({ key, name, status: s, label }),
    send: (key: string, name: string, body: string) => comment.mutateAsync({ key, name, body }),
    exportCsv: (p: Pick<InvestorParams, 'kind' | 'q'>) => exporting.mutate(p),
    toast,
  };
}
