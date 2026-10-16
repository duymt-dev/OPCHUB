import { memberRowSchema, pageSchema } from '@opchub/shared/api';
import {
  cursorPageSchema,
  exportJobSchema,
  groupDetailSchema,
  groupItemSchema,
  groupMemberListSchema,
  keywordListSchema,
  messageSchema,
  reportSchema,
  roomSchema,
  type GroupAdminUpsertInput,
  type GroupMembersExport,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import type { ExportStatus } from './types';

/** SRS §13 Groups (admin) + Chat reports + từ khóa kiểm duyệt (Q-G4c-1) */

/** 34 nhóm theo tỉnh (D-29) — tải trọn rồi lọc/sắp xếp tại chỗ như prototype */
const ALL = 100;

export const groupKeys = {
  all: ['admin-groups'] as const,
  list: () => [...groupKeys.all, 'list'] as const,
  detail: (id: string) => [...groupKeys.all, 'detail', id] as const,
  counts: () => [...groupKeys.all, 'counts'] as const,
  members: (ids: string[], status: ExportStatus) =>
    [...groupKeys.all, 'members', ids.join(','), status] as const,
  people: () => ['admin-people'] as const,
  reports: () => ['admin-reports', 'open'] as const,
  keywords: () => ['admin-keywords'] as const,
  rooms: (groupId: string) => ['admin-rooms', groupId] as const,
  messages: (roomId: string) => ['admin-messages', roomId] as const,
};

const enc = encodeURIComponent;

export const fetchGroups = () =>
  api(`/admin/groups?page=1&size=${ALL}`, { schema: pageSchema(groupItemSchema) });

export const fetchGroup = (id: string) =>
  api(`/admin/groups/${enc(id)}`, { schema: groupDetailSchema });

export const saveGroup = (body: GroupAdminUpsertInput, id: string | null) =>
  api(id ? `/admin/groups/${enc(id)}` : '/admin/groups', {
    method: id ? 'PATCH' : 'POST',
    body,
    schema: groupDetailSchema,
  });

export const deleteGroup = (id: string) =>
  api(`/admin/groups/${enc(id)}`, { method: 'DELETE', schema: z.object({ id: z.string() }) });

export const fetchMemberCounts = () =>
  api('/admin/groups/member-counts', { schema: z.record(z.string(), z.number().int()) });

export const fetchGroupMembers = (ids: string[], status: ExportStatus) =>
  api(`/admin/groups/members?groupIds=${enc(ids.join(','))}&status=${status}`, {
    schema: groupMemberListSchema,
  });

export const exportGroupMembers = (body: GroupMembersExport) =>
  api('/admin/groups/members/export', {
    method: 'POST',
    body,
    schema: exportJobSchema.extend({ rows: z.number().int() }),
  });

/** Danh sách người chọn làm chủ nhóm / điều phối viên */
export const fetchPeople = () =>
  api(`/admin/users?page=1&size=${ALL}`, { schema: pageSchema(memberRowSchema) });

export const fetchReports = () =>
  api(`/admin/reports?status=open&page=1&size=${ALL}`, { schema: pageSchema(reportSchema) });

export const actOnReport = (id: string, action: 'dismiss' | 'hide' | 'warn' | 'lock') =>
  api(`/admin/reports/${enc(id)}/action`, {
    method: 'POST',
    body: { action },
    schema: reportSchema,
  });

export const fetchKeywords = () => api('/admin/moderation/keywords', { schema: keywordListSchema });

export const addKeyword = (word: string) =>
  api('/admin/moderation/keywords', { method: 'POST', body: { word }, schema: keywordListSchema });

/** Trình xem chat chỉ đọc (D-26): phòng của nhóm + tin nhắn (SRS §13 Chat) */
export const fetchRooms = (groupId: string) =>
  api(`/groups/${enc(groupId)}/rooms`, { schema: z.object({ items: z.array(roomSchema) }) });

export const fetchMessages = (roomId: string) =>
  api(`/rooms/${enc(roomId)}/messages?size=50`, { schema: cursorPageSchema(messageSchema) });

export const removeKeyword = (word: string) =>
  api(`/admin/moderation/keywords/${enc(word)}`, {
    method: 'DELETE',
    schema: keywordListSchema,
  });
