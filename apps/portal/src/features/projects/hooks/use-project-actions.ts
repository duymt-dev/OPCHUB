'use client';

import type { ProjectCard, ProjectSave } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import { followProject, projectKeys, requestRepoAccess, saveProject, shareProject } from '../api';

/** Lỗi API → toast thông báo của server (hoặc câu chung) */
export function useErrorToast() {
  const toast = useToast();
  const t = useTranslations('projects.toast');
  return (e: unknown) => toast(e instanceof ApiError ? e.message : t('failed'));
}

/** Theo dõi / bỏ theo dõi — cập nhật lại danh sách, thống kê, chi tiết */
export function useFollow() {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('projects.follow');
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (p: Pick<ProjectCard, 'id' | 'name' | 'followedByMe'>) =>
      followProject(p.id, !p.followedByMe),
    onSuccess: (r, p) => {
      toast(r.followedByMe ? t('followed', { name: p.name }) : t('unfollowed', { name: p.name }));
      void qc.invalidateQueries({ queryKey: projectKeys.all });
    },
    onError,
  });
}

export function useRepoAccess(id: string, owner: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('projects.repo');
  const onError = useErrorToast();
  return useMutation({
    mutationFn: () => requestRepoAccess(id),
    onSuccess: () => {
      toast(t('requestedToast', { name: owner }));
      void qc.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
    onError,
  });
}

/** Lưu nháp / gửi duyệt: trạng thái do server chuyển (luật 7). Lỗi do form hiện tại ô (BUG-022) */
export function useSaveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, id }: { body: ProjectSave; id?: string | undefined }) =>
      saveProject(body, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useShareProject() {
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (v: { id: string; groupIds: string[]; message: string }) =>
      shareProject(v.id, v.groupIds, v.message),
    onError,
  });
}
