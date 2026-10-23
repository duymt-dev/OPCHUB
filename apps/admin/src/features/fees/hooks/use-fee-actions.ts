'use client';

import type { FeeRow } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import { collectFees, exportFees, feeKeys, feeRowAction, remindAllFees, remindFees } from '../api';
import { remindTarget, vnd } from '../model';

type RowAction = 'collect' | 'renew' | 'remind';

/** Gom file CSV server trả về rồi cho trình duyệt tải (như prototype) */
function download(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Thao tác ghi của màn Phí thành viên — mọi thao tác gọi API (BE ghi audit_logs, luật 10).
 * Số tiền toast = `amount` của dòng (D-68: theo gói của thành viên, số nguyên VND).
 */
export function useFeeActions(clearSelection: () => void) {
  const t = useTranslations('fees.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: feeKeys.all });
  /** BUG-024: giữ lý do server (409 hết điều kiện…), lỗi mạng → câu chung */
  const fail = (e: unknown) => toast(messageOf(e, t('failed')));

  const row = useMutation({
    mutationFn: ({ r, action }: { r: FeeRow; action: RowAction }) => feeRowAction(r.userId, action),
    onSuccess: (_d, { r, action }) => {
      if (action === 'remind') toast(t('reminded', { to: remindTarget(r) }));
      else {
        toast(t('collected', { amount: vnd(r.amount), name: r.fullName }));
        refresh();
      }
    },
    onError: fail,
  });

  const bulkCollect = useMutation({
    mutationFn: collectFees,
    onSuccess: (_d, ids) => {
      toast(t('bulkCollected', { n: ids.length }));
      clearSelection();
      refresh();
    },
    onError: fail,
  });

  const bulkRemind = useMutation({
    mutationFn: remindFees,
    onSuccess: (_d, ids) => {
      toast(t('bulkReminded', { n: ids.length }));
      clearSelection();
    },
    onError: fail,
  });

  const remindAll = useMutation({
    mutationFn: remindAllFees,
    onSuccess: (d) => toast(t('bulkReminded', { n: d.queued })),
    onError: fail,
  });

  const exportCsv = useMutation({
    mutationFn: exportFees,
    onSuccess: (d, ids) => {
      download(d.filename, d.csv);
      toast(t('exported', { n: ids.length }));
    },
    onError: fail,
  });

  return {
    onRow: (r: FeeRow, action: RowAction) => row.mutate({ r, action }),
    onBulkCollect: (ids: string[]) => bulkCollect.mutate(ids),
    onBulkRemind: (ids: string[]) => bulkRemind.mutate(ids),
    onExport: (ids: string[]) => exportCsv.mutate(ids),
    onRemindAll: () => remindAll.mutate(),
  };
}
