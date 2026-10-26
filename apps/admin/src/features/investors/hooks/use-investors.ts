'use client';

import { useToast } from '@opchub/ui';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import { exportInvestors, fetchInvestors, fetchInvestorSummary, investorKeys } from '../api';
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

/** Tải file CSV server dựng về máy */
function download(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Xuất CSV — gọi API (BE ghi audit_logs, luật 10); D-72 không còn đổi trạng thái/trao đổi */
export function useInvestorActions() {
  const t = useTranslations('investors.toast');
  const toast = useToast();
  /** BUG-024: giữ lý do server (409 hết điều kiện…), lỗi mạng → câu chung */
  const fail = (e: unknown) => toast(messageOf(e, t('failed')));

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
    exportCsv: (p: Pick<InvestorParams, 'kind' | 'q'>) => exporting.mutate(p),
    toast,
  };
}
