'use client';

import type { Report } from '@opchub/shared/api-domains';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actOnReport,
  addKeyword,
  fetchKeywords,
  fetchReports,
  groupKeys,
  removeKeyword,
} from '../api';
import { useErrorToast } from './use-groups';

type ReportPage = Awaited<ReturnType<typeof fetchReports>>;

export function useOpenReports() {
  return useQuery({
    queryKey: groupKeys.reports(),
    queryFn: fetchReports,
    select: (p) => p.items,
  });
}

/** Xử lý báo cáo: gỡ khỏi danh sách chờ ngay khi máy chủ xác nhận */
export function useReportAction() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: ({ r, action }: { r: Report; action: 'dismiss' | 'hide' | 'warn' | 'lock' }) =>
      actOnReport(r.id, action),
    onSuccess: (done) =>
      qc.setQueryData<ReportPage>(groupKeys.reports(), (old) =>
        old
          ? { ...old, items: old.items.filter((x) => x.id !== done.id), total: old.total - 1 }
          : old,
      ),
    onError,
  });
}

export function useKeywords() {
  return useQuery({
    queryKey: groupKeys.keywords(),
    queryFn: fetchKeywords,
    select: (k) => k.items,
  });
}

export function useKeywordMutations() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  const apply = (k: { items: string[] }) => qc.setQueryData(groupKeys.keywords(), k);
  return {
    add: useMutation({ mutationFn: addKeyword, onSuccess: apply, onError }),
    remove: useMutation({ mutationFn: removeKeyword, onSuccess: apply, onError }),
  };
}
