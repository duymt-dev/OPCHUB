'use client';

import type { AdminProjectReview, ProjectBulkAction } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import {
  bulkProjects,
  deleteProject,
  fetchProjects,
  projectKeys,
  reviewProject,
  setFeatured,
} from '../api';

export function useAdminProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: fetchProjects,
    select: (page) => page.items,
  });
}

function useOnError() {
  const toast = useToast();
  const t = useTranslations('projects.toast');
  return (e: unknown) => toast(e instanceof ApiError ? e.message : t('failed'));
}

/** Mọi mutation làm mới đúng một key (danh sách) — số trên tab tính lại từ danh sách */
function useListMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  const onError = useOnError();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.list() }),
    onError,
  });
}

export const useReviewProject = () =>
  useListMutation(({ id, body }: { id: string; body: AdminProjectReview }) =>
    reviewProject(id, body),
  );

export const useBulkProjects = () =>
  useListMutation(({ ids, action }: { ids: string[]; action: ProjectBulkAction }) =>
    bulkProjects(ids, action),
  );

export const useDeleteProject = () => useListMutation((id: string) => deleteProject(id));

export const useFeatureProject = () =>
  useListMutation((projectId: string | null) => setFeatured(projectId));
