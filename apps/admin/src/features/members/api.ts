import { pageSchema } from '@opchub/shared/api';
import {
  adminMemberPageSchema,
  adminMemberSchema,
  assignGroupsResponseSchema,
  bulkStatusResultSchema,
  exportJobSchema,
  groupItemSchema,
  type AdminMember,
} from '@opchub/shared/api-domains';
import type { UserStatus } from '@opchub/shared';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import type { MembersParams } from './types';

/**
 * SRS §13 Users (admin): `GET /admin/users?type&q&page`, `PATCH /admin/users/:id/status`,
 * `POST /admin/users/assign-groups`, `POST /admin/users/export`. Bổ sung (Q-G4a-1):
 * `POST /admin/users/status`, `POST /admin/users/:id/verification`.
 * v4.2 (D-100): UI không còn lọc / nhắc "Khởi đầu" (endpoint server giữ cho client cũ).
 */

export const memberKeys = {
  all: ['admin-members'] as const,
  list: (p: Omit<MembersParams, 'view'>) => [...memberKeys.all, 'list', p] as const,
  groups: ['admin-groups', 'all'] as const,
};

export function fetchMembers(p: Omit<MembersParams, 'view'>) {
  const qs = new URLSearchParams({ page: String(p.page), size: String(p.size) });
  if (p.type !== 'all') qs.set('type', p.type);
  if (p.q) qs.set('q', p.q);
  // Thanh lọc v4: khoá URL ngắn → tham số API
  const extra = {
    group: p.grp,
    role: p.role,
    fee: p.fee,
    status: p.st,
    profile: p.prof,
    days: p.day,
  };
  for (const [k, v] of Object.entries(extra)) if (v) qs.set(k, v);
  return api(`/admin/users?${qs.toString()}`, { schema: adminMemberPageSchema });
}

/** 90 nhóm (D-89) — tải một lần cho chip nhóm + modal gán nhóm */
export const fetchAllGroups = () =>
  api('/admin/groups?page=1&size=100', { schema: pageSchema(groupItemSchema) });

const userPath = (id: string) => `/admin/users/${encodeURIComponent(id)}`;

export const updateStatus = (id: string, status: UserStatus) =>
  api(`${userPath(id)}/status`, {
    method: 'PATCH',
    body: { status },
    schema: z.object({ id: z.string(), status: z.string() }),
  });

export const updateStatusBulk = (userIds: string[], status: UserStatus) =>
  api('/admin/users/status', {
    method: 'POST',
    body: { userIds, status },
    schema: bulkStatusResultSchema,
  });

/** `role` là vai trò trong nhóm của modal (Q-G4a-3) — SRS chưa có trường này */
export const assignGroups = (userIds: string[], groupIds: string[], role: 'member' | 'lecturer') =>
  api('/admin/users/assign-groups', {
    method: 'POST',
    body: { userIds, groupIds, role },
    schema: assignGroupsResponseSchema,
  });

export const exportMembers = (userIds: string[]) =>
  api('/admin/users/export', { method: 'POST', body: { userIds }, schema: exportJobSchema });

export const decideVerification = (id: string, decision: 'approve' | 'reject') =>
  api(`${userPath(id)}/verification`, {
    method: 'POST',
    body: { decision },
    schema: adminMemberSchema,
  });

export type { AdminMember };
