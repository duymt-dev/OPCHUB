import { pageSchema } from '@opchub/shared/api';
import {
  commentReplySchema,
  followResultSchema,
  investorInterestSchema,
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
} from '@opchub/shared/api-domains';
import type {
  CreateInterestPortal,
  Profile,
  ProjectSave,
  ProjectSort,
} from '@opchub/shared/api-domains';
import { groupItemSchema, profileSchema } from '@opchub/shared/api-domains';
import { phoneCountries } from '@opchub/shared/fixtures';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import type { CommentType } from './types';

/** REST màn Dự án OPC (SRS §13 Projects + Investors; bổ sung ở Q-G3b-1) */

const items = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });
const enc = encodeURIComponent;

/** Khám phá tải trọn danh sách đang hiển thị rồi phân trang tại chỗ (như Cộng đồng — Q-G2b-1) */
const ALL_SIZE = 100;

/** D-89 (v4): API tìm + sắp xếp; nhóm ngành / bộ lọc trái lọc tại chỗ (đếm như prototype) */
export interface ListFilter {
  q: string;
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
  groups: () => ['groups', 'list'] as const,
};

export const fetchStats = () => api('/projects/stats', { schema: projectStatsSchema });

export function fetchProjects(f: ListFilter) {
  const p = new URLSearchParams({ page: '1', size: String(ALL_SIZE), sort: f.sort });
  if (f.q.trim()) p.set('q', f.q.trim());
  return api(`/projects?${p.toString()}`, { schema: pageSchema(projectCardSchema) });
}

export const fetchMine = () =>
  api('/me/projects', { schema: items(projectCardSchema) }).then((r) => r.items);

export const fetchProject = (id: string) =>
  api(`/projects/${enc(id)}`, { schema: projectDetailSchema });

/** Hồ sơ của tôi — cùng khoá + dữ liệu cache với màn Hồ sơ (`profileKeys.me()`) */
export const ownerProfileKey = ['profile', 'me'] as const;
export const fetchOwnerProfile = () => api('/me', { schema: profileSchema });

/** Hồ sơ → email + SĐT (kèm mã quốc gia) điền sẵn khối Liên hệ công khai (BUG-016) */
export function ownerContactOf(p: Profile): { email: string; phone: string } {
  const dial = phoneCountries.find((c) => c.id === p.phone.country)?.dial ?? '';
  const num = p.phone.number.trim();
  return { email: p.email, phone: num ? `${dial} ${num}`.trim() : '' };
}

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

export const suggestMembers = (q: string) =>
  api(`/members/suggest?q=${enc(q)}`, { schema: items(memberSuggestionSchema) }).then(
    (r) => r.items,
  );

/** Nhóm đã tham gia (chia sẻ dự án) — cùng khoá cache với màn Cộng đồng */
export const fetchGroups = () =>
  api(`/groups?page=1&size=100`, { schema: pageSchema(groupItemSchema) });
