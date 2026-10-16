'use client';

import type { ProjectCommentView } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { likeComment, postComment, projectKeys, replyComment, resolveComment } from '../api';
import type { CommentType } from '../types';
import { useErrorToast } from './use-project-actions';

/** Góp ý: gửi, hữu ích, trả lời, tiếp nhận — ghi thẳng vào cache danh sách góp ý */
export function useCommentActions(projectId: string, projectName: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('projects.comments');
  const onError = useErrorToast();
  const key = projectKeys.comments(projectId);
  const patch = (id: string, fn: (c: ProjectCommentView) => ProjectCommentView) =>
    qc.setQueryData<ProjectCommentView[]>(key, (old) => old?.map((c) => (c.id === id ? fn(c) : c)));

  const post = useMutation({
    mutationFn: (v: { type: CommentType; body: string }) => postComment(projectId, v.type, v.body),
    onSuccess: (c) => {
      qc.setQueryData<ProjectCommentView[]>(key, (old) => [c, ...(old ?? [])]);
      toast(t('posted', { name: projectName }));
    },
    onError,
  });

  const like = useMutation({
    mutationFn: (c: ProjectCommentView) => likeComment(c.id, !c.likedByMe),
    onSuccess: (r, c) => patch(c.id, (x) => ({ ...x, likes: r.likes, likedByMe: r.likedByMe })),
    onError,
  });

  const reply = useMutation({
    mutationFn: (v: { id: string; body: string }) => replyComment(v.id, v.body),
    onSuccess: (r, v) => patch(v.id, (x) => ({ ...x, replies: [...x.replies, r] })),
    onError,
  });

  const resolve = useMutation({
    mutationFn: (c: ProjectCommentView) => resolveComment(c.id, !c.resolved),
    onSuccess: (r, c) => patch(c.id, (x) => ({ ...x, resolved: r.resolved })),
    onError,
  });

  return { post, like, reply, resolve };
}
