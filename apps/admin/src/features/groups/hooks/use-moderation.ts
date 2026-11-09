'use client';

import { type LockDays, MODERATION_DEFAULTS, type Report } from '@opchub/shared/api-domains';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actOnReport,
  addKeyword,
  fetchKeywords,
  fetchModerationSettings,
  fetchReports,
  groupKeys,
  removeKeyword,
  saveModerationSettings,
  saveAiModerationSettings,
} from '../api';
import { useErrorToast } from './use-groups';

export function useOpenReports() {
  return useQuery({
    queryKey: groupKeys.reports(),
    queryFn: fetchReports,
    select: (p) => p.items,
  });
}

/**
 * V4-612 (D-77): Khôi phục tin / Khóa N ngày — ca đã xử lý rời danh sách chờ; tải lại danh sách để
 * các thẻ cùng người gửi cập nhật "Vi phạm lần n" / "Đã khóa".
 */
export function useReportAction() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: ({
      r,
      action,
      days,
    }: {
      r: Report;
      action: 'restore' | 'lock' | 'hide' | 'dismiss';
      days?: LockDays;
    }) => actOnReport(r.id, action, days),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.reports() }),
    onError,
  });
}

/** "Thời gian khóa" (mặc định 7 ngày) */
export function useModerationSettings() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  const query = useQuery({
    queryKey: groupKeys.modSettings(),
    queryFn: fetchModerationSettings,
  });
  const save = useMutation({
    mutationFn: saveModerationSettings,
    onSuccess: (s) => qc.setQueryData(groupKeys.modSettings(), s),
    onError,
  });
  const aiSave = useMutation({
    mutationFn: saveAiModerationSettings,
    onSuccess: (s) => qc.setQueryData(groupKeys.modSettings(), s),
    onError,
  });
  return {
    days: query.data?.autoLockDays ?? MODERATION_DEFAULTS.autoLockDays,
    save,
    ai: query.data?.ai ?? false,
    aiSave,
  };
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
