'use client';

import type { ReportParams } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import { type ExportOutcome, useExportJob } from '@/lib/use-export-job';
import { exportReport, fetchReportPreview, fetchReportScopes, reportKeys } from '../api';

export function useReportScopes() {
  return useQuery({ queryKey: reportKeys.scopes, queryFn: fetchReportScopes });
}

export function useReportPreview(p: ReportParams | null) {
  return useQuery({
    queryKey: reportKeys.preview(p),
    queryFn: () => fetchReportPreview(p as ReportParams),
    enabled: !!p,
    placeholderData: keepPreviousData,
  });
}

/**
 * Xuất CSV (`file` = tên tải không dấu như server): tạo job `report` (server ghi audit `report.export` cùng transaction) → chờ xong → tải
 * file qua link ký (audit `export.download`). Lỗi / quá hạn → toast có lý do.
 */
export function useReportExport() {
  const t = useTranslations('reports.toast');
  const toast = useToast();
  const runExport = useExportJob();
  const reason: Record<Exclude<ExportOutcome['kind'], 'done' | 'error'>, string> = {
    failed: t('exportFailed'),
    timeout: t('exportTimeout'),
  };
  return useMutation({
    mutationFn: async ({ params, file }: { params: ReportParams; file: string }) =>
      runExport((await exportReport(params)).jobId, file),
    onMutate: () => toast(t('exporting')),
    onSuccess: (out, v) => {
      if (out.kind === 'done') toast(t('exported', { file: v.file }));
      else toast(out.kind === 'error' ? out.message : reason[out.kind]);
    },
    onError: (e) => toast(messageOf(e, t('failed'))),
  });
}
