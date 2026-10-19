'use client';

import { useToast } from '@opchub/ui';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { type ExportOutcome, useExportJob } from '@/lib/use-export-job';
import { exportMembers } from '../api';

/**
 * Xuất CSV thành viên (BUG-013, QT-12 bước 5): tạo job → chờ xong → tải file. Mỗi lần nhận link
 * server ghi audit `export.download` (NA-14); lỗi / quá hạn chờ → toast có lý do.
 */
export function useMemberExport(fail: (e: unknown) => void) {
  const t = useTranslations('members.toast');
  const toast = useToast();
  const runExport = useExportJob();
  const reason: Record<Exclude<ExportOutcome['kind'], 'done' | 'error'>, string> = {
    failed: t('exportFailed'),
    timeout: t('exportTimeout'),
  };
  return useMutation({
    mutationFn: async (ids: string[]) => runExport((await exportMembers(ids)).jobId),
    onMutate: (ids) => toast(t('exporting', { n: ids.length })),
    onSuccess: (out) => {
      if (out.kind === 'done') toast(t('exported', { n: out.rows }));
      else toast(out.kind === 'error' ? out.message : reason[out.kind]);
    },
    onError: fail,
  });
}
