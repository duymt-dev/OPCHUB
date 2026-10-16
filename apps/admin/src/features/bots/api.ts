import { pageSchema } from '@opchub/shared/api';
import {
  botActivityListSchema,
  botSettingsSchema,
  botThreadApprovedSchema,
  botThreadListSchema,
  groupItemSchema,
  idResultSchema,
  personaListSchema,
  personaSchema,
  scriptListSchema,
  scriptRunSchema,
  scriptSchema,
  type BotSettings,
  type PersonaUpsert,
  type ScriptUpsert,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/**
 * SRS §13 Bot: CRUD /admin/personas, CRUD /admin/scripts, POST /admin/scripts/:id/run,
 * GET|PATCH /admin/bot/settings + bổ sung Q-G4d-1: /admin/bot/threads, /admin/bot/activity.
 */

export const botKeys = {
  all: ['bots'] as const,
  personas: () => [...botKeys.all, 'personas'] as const,
  scripts: () => [...botKeys.all, 'scripts'] as const,
  threads: () => [...botKeys.all, 'threads'] as const,
  settings: () => [...botKeys.all, 'settings'] as const,
  activity: () => [...botKeys.all, 'activity'] as const,
  groups: () => ['admin', 'groups', 'all'] as const,
};

export const fetchPersonas = () => api('/admin/personas', { schema: personaListSchema });
export const fetchScripts = () => api('/admin/scripts', { schema: scriptListSchema });
export const fetchThreads = () => api('/admin/bot/threads', { schema: botThreadListSchema });
export const fetchSettings = () => api('/admin/bot/settings', { schema: botSettingsSchema });
export const fetchActivity = () => api('/admin/bot/activity', { schema: botActivityListSchema });
/** 34 nhóm (D-29) — một trang đủ cho chip chọn nhóm */
export const fetchGroups = () =>
  api('/admin/groups?page=1&size=100', { schema: pageSchema(groupItemSchema) });

export const savePersona = (id: string | null, body: PersonaUpsert) =>
  api(id ? `/admin/personas/${id}` : '/admin/personas', {
    method: id ? 'PATCH' : 'POST',
    body,
    schema: personaSchema,
  });

export const deletePersona = (id: string) =>
  api(`/admin/personas/${id}`, { method: 'DELETE', schema: idResultSchema });

export const saveScript = (id: string | null, body: ScriptUpsert) =>
  api(id ? `/admin/scripts/${id}` : '/admin/scripts', {
    method: id ? 'PATCH' : 'POST',
    body,
    schema: scriptSchema,
  });

export const deleteScript = (id: string) =>
  api(`/admin/scripts/${id}`, { method: 'DELETE', schema: idResultSchema });

export const runScript = (id: string) =>
  api(`/admin/scripts/${id}/run`, { method: 'POST', schema: scriptRunSchema });

export const patchSettings = (body: Partial<BotSettings>) =>
  api('/admin/bot/settings', { method: 'PATCH', body, schema: botSettingsSchema });

export const approveThread = (id: string) =>
  api(`/admin/bot/threads/${id}/approve`, { method: 'POST', schema: botThreadApprovedSchema });

export const rejectThread = (id: string) =>
  api(`/admin/bot/threads/${id}`, { method: 'DELETE', schema: idResultSchema });
