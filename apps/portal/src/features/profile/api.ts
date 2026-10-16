import { pageSchema } from '@opchub/shared/api';
import {
  eventItemSchema,
  groupItemSchema,
  joinResultSchema,
  presignResultSchema,
  profileSchema,
  revokeSessionsResultSchema,
  ssoLinkResultSchema,
  type ChangePasswordRequest,
  type PresignRequest,
  type UpdateProfileRequest,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';

/**
 * SRS §13 `GET/PATCH /me`, `GET /groups`, `GET /events`, `DELETE /groups/:id/join` + bổ sung
 * (Q-G3c-1): đổi mật khẩu, đăng xuất thiết bị khác, liên kết SSO, presigned upload ảnh.
 */

/** 34 nhóm (D-29) + vài chục sự kiện: tải một trang rồi lọc của tôi tại chỗ */
const ALL_SIZE = 100;

export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  groups: () => ['groups', 'list'] as const,
  events: () => ['events', 'list', 'all'] as const,
};

export const fetchProfile = () => api('/me', { schema: profileSchema });

export const patchProfile = (body: UpdateProfileRequest) =>
  api('/me', { method: 'PATCH', body, schema: profileSchema });

export const fetchGroups = () =>
  api(`/groups?page=1&size=${ALL_SIZE}`, { schema: pageSchema(groupItemSchema) });

export const fetchEvents = () =>
  api(`/events?page=1&size=${ALL_SIZE}`, { schema: pageSchema(eventItemSchema) });

export const leaveGroup = (id: string) =>
  api(`/groups/${encodeURIComponent(id)}/join`, { method: 'DELETE', schema: joinResultSchema });

export const changePassword = (body: ChangePasswordRequest) =>
  api('/auth/password/change', { method: 'POST', body, schema: z.null() });

export const revokeOtherSessions = () =>
  api('/auth/sessions/revoke-others', { method: 'POST', schema: revokeSessionsResultSchema });

export const setSsoLink = (provider: string, linked: boolean) =>
  api(`/me/sso/${encodeURIComponent(provider)}`, {
    method: linked ? 'POST' : 'DELETE',
    schema: ssoLinkResultSchema,
  });

/** Presigned PUT (security.md: API không nhận file) → URL công khai của ảnh */
export async function uploadAvatar(file: File): Promise<string> {
  const req: PresignRequest = {
    kind: 'avatar',
    contentType: file.type as PresignRequest['contentType'],
    size: file.size,
  };
  const { uploadUrl, publicUrl } = await api('/uploads/presign', {
    method: 'POST',
    body: req,
    schema: presignResultSchema,
  });
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!res.ok) throw new Error(res.statusText);
  return publicUrl;
}
