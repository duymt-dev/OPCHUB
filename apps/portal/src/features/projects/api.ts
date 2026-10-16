import { pageSchema } from '@opchub/shared/api';
import {
  commentReplySchema,
  followResultSchema,
  investorInterestSchema,
  investorThreadSchema,
  likeResultSchema,
  memberSuggestionSchema,
  projectCardSchema,
  projectCommentViewSchema,
  projectDetailSchema,
  projectReplyViewSchema,
  projectStatsSchema,
  repoAccessResultSchema,
  resolvedResultSchema,
  shareResultSchema,
  threadMessageSchema,
} from '@opchub/shared/api-domains';
import type {
  CreateInterestPortal,
  ProjectSave,
  ProjectStageFilter,
  ProjectSort,
} from '@opchub/shared/api-domains';
import { groupItemSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import type { CommentType } from './types';

/** REST màn Dự án OPC (SRS §13 Projects + Investors; bổ sung ở Q-G3b-1) */

const items = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });
const enc = encodeURIComponent;

/** Khám phá tải trọn danh sách đang hiển thị rồi phân trang tại chỗ (như Cộng đồng — Q-G2b-1) */
const ALL_SIZE = 100;

export interface ListFilter {
  q: string;
  cat: string;
  stage: ProjectStageFilter | 'all';
  sort: ProjectSort;
}

export const projectKeys = {
  all: ['projects'] as const,
  stats: () => [...projectKeys.all, 'stats'] as const,
  list: (f: ListFilter) => [...projectKeys.all, 'list', f] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  mine: () => [...projectKeys.all, 'mine'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  own: (id: string) => [...projectKeys.all, 'own', id] as const,
  comments: (id: string) => [...projectKeys.all, 'comments', id] as const,
  interests: (id: string) => [...projectKeys.all, 'interests', id] as const,
  threads: () => ['investor-thread'] as const,
  groups: () => ['groups', 'list'] as const,
};

export const fetchStats = () => api('/projects/stats', { schema: projectStatsSchema });

export function fetchProjects(f: ListFilter) {
  const p = new URLSearchParams({ page: '1', size: String(ALL_SIZE), sort: f.sort });
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.cat !== 'all') p.set('cat', f.cat);
  if (f.stage !== 'all') p.set('stage', f.stage);
  return api(`/projects?${p.toString()}`, { schema: pageSchema(projectCardSchema) });
}

export const fetchMine = () =>
  api('/me/projects', { schema: items(projectCardSchema) }).then((r) => r.items);

export const fetchProject = (id: string) =>
  api(`/projects/${enc(id)}`, { schema: projectDetailSchema });

export const fetchOwnProject = (id: string) =>
  api(`/me/projects/${enc(id)}`, { schema: projectDetailSchema });

export const saveProject = (body: ProjectSave, id?: string) =>
  api(id ? `/projects/${enc(id)}` : '/projects', {
    method: id ? 'PATCH' : 'POST',
    body,
    schema: projectCardSchema,
  });

export const followProject = (id: string, following: boolean) =>
  api(`/projects/${enc(id)}/follow`, {
    method: 'PUT',
    body: { following },
    schema: followResultSchema,
  });

export const requestRepoAccess = (id: string) =>
  api(`/projects/${enc(id)}/repo-access`, { method: 'POST', schema: repoAccessResultSchema });

export const shareProject = (id: string, groupIds: string[], message: string) =>
  api(`/projects/${enc(id)}/share`, {
    method: 'POST',
    body: { groupIds, message },
    schema: shareResultSchema,
  });

export const fetchComments = (id: string) =>
  api(`/projects/${enc(id)}/comments`, { schema: items(projectCommentViewSchema) }).then(
    (r) => r.items,
  );

export const postComment = (id: string, type: CommentType, body: string) =>
  api(`/projects/${enc(id)}/comments`, {
    method: 'POST',
    body: { type, body },
    schema: projectCommentViewSchema,
  });

export const likeComment = (id: string, liked: boolean) =>
  api(`/comments/${enc(id)}/like`, { method: 'PUT', body: { liked }, schema: likeResultSchema });

export const replyComment = (id: string, body: string) =>
  api(`/comments/${enc(id)}/replies`, {
    method: 'POST',
    body: commentReplySchema.parse({ body }),
    schema: projectReplyViewSchema,
  });

export const resolveComment = (id: string, resolved: boolean) =>
  api(`/comments/${enc(id)}/resolved`, {
    method: 'PUT',
    body: { resolved },
    schema: resolvedResultSchema,
  });

/** Idempotency-Key (SRS §13.1): gửi lại cùng khoá không tạo bản ghi trùng */
export const sendInterest = (id: string, body: CreateInterestPortal, key: string) =>
  api(`/projects/${enc(id)}/interest`, {
    method: 'POST',
    body,
    idempotencyKey: key,
    schema: investorInterestSchema,
  });

export const fetchInterests = (id: string) =>
  api(`/projects/${enc(id)}/interests`, { schema: items(investorInterestSchema) }).then(
    (r) => r.items,
  );

export const fetchThreads = () =>
  api('/me/investor-thread', { schema: items(investorThreadSchema) }).then((r) => r.items);

export const postThread = (key: string, body: string) =>
  api(`/investor-thread/${enc(key)}/messages`, {
    method: 'POST',
    body: { body },
    schema: threadMessageSchema,
  });

export const suggestMembers = (q: string) =>
  api(`/members/suggest?q=${enc(q)}`, { schema: items(memberSuggestionSchema) }).then(
    (r) => r.items,
  );

/** Nhóm đã tham gia (chia sẻ dự án) — cùng khoá cache với màn Cộng đồng */
export const fetchGroups = () =>
  api(`/groups?page=1&size=100`, { schema: pageSchema(groupItemSchema) });
