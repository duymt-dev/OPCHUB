import {
  directorAppointmentSchema,
  directorConfigPatchSchema,
  directorConfigSchema,
  directorHistorySchema,
  directorMemberPageSchema,
  directorRevokeSchema,
  type DirectorAppointment,
  type DirectorConfigPatch,
  type DirectorRegion,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

const ROOT = '/admin/gdv';
export const directorKeys = {
  all: ['regional-directors'] as const,
  config: ['regional-directors', 'config'] as const,
  history: ['regional-directors', 'history'] as const,
  members: (q: string) => ['regional-directors', 'members', q] as const,
};
export const fetchDirectors = () => api(ROOT, { schema: directorConfigSchema });
export const appointDirector = (body: DirectorAppointment) =>
  api(ROOT, {
    method: 'POST',
    body: directorAppointmentSchema.parse(body),
    schema: directorConfigSchema,
  });
export const updateDirector = (region: DirectorRegion, body: DirectorConfigPatch) =>
  api(`${ROOT}/${region}`, {
    method: 'PATCH',
    body: directorConfigPatchSchema.parse(body),
    schema: directorConfigSchema,
  });
export const revokeDirector = (region: DirectorRegion, version: number) =>
  api(`${ROOT}/${region}`, {
    method: 'DELETE',
    body: directorRevokeSchema.parse({ version }),
    schema: directorConfigSchema,
  });
export const fetchDirectorMembers = (q: string, page: number) =>
  api(`${ROOT}/members?${new URLSearchParams({ q, page: String(page), size: '20' })}`, {
    schema: directorMemberPageSchema,
  });
export const fetchDirectorHistory = (cursor: { at: string; id: string } | null) => {
  const query = new URLSearchParams({ size: '20' });
  if (cursor) {
    query.set('beforeAt', cursor.at);
    query.set('beforeId', cursor.id);
  }
  return api(`${ROOT}/history?${query}`, { schema: directorHistorySchema });
};
