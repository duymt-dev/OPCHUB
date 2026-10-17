import {
  adminAccountSchema,
  adminCategorySchema,
  auditLogRowSchema,
  generalSettingsSchema,
  languageSettingsSchema,
  rolePermissionsSchema,
  securitySettingsSchema,
  sendResultSchema,
  smtpSettingsSchema,
  welcomeMailSchema,
  type AdminInvite,
  type GeneralSettingsPatch,
  type LanguagePatch,
  type RolePermissions,
  type SecurityPatch,
  type SmtpVerify,
  type WelcomeMail,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import type { CategoryDraft } from './types';

/** SRS §13 Settings + bổ sung Q-G6a-1 (chung, thứ tự lĩnh vực, admins, audit, SSO, ngôn ngữ) */

const items = <T extends z.ZodType>(s: T) => z.object({ items: z.array(s) });
const idSchema = z.object({ id: z.string() });

export const settingsKeys = {
  general: ['admin-settings', 'general'] as const,
  categories: ['admin-settings', 'categories'] as const,
  roles: ['admin-settings', 'roles'] as const,
  welcome: ['admin-settings', 'welcome'] as const,
  smtp: ['admin-settings', 'smtp'] as const,
  admins: ['admin-settings', 'admins'] as const,
  log: ['admin-settings', 'log'] as const,
  security: ['admin-settings', 'security'] as const,
  languages: ['admin-settings', 'languages'] as const,
};

export const fetchGeneral = () => api('/admin/settings/general', { schema: generalSettingsSchema });
export const patchGeneral = (body: GeneralSettingsPatch) =>
  api('/admin/settings/general', { method: 'PATCH', body, schema: generalSettingsSchema });

export const fetchCategories = () =>
  api('/admin/categories', { schema: items(adminCategorySchema) }).then((r) => r.items);

const catBody = (d: CategoryDraft, enabled: boolean) => ({
  name: d.name.trim(),
  color: d.color,
  scope: d.scope,
  enabled,
});
export const createCategory = (d: CategoryDraft) =>
  api('/admin/categories', { method: 'POST', body: catBody(d, true), schema: adminCategorySchema });
export const updateCategory = (id: string, d: CategoryDraft, enabled: boolean) =>
  api(`/admin/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: catBody(d, enabled),
    schema: adminCategorySchema,
  });
export const toggleCategory = (id: string, enabled: boolean) =>
  api(`/admin/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { enabled },
    schema: adminCategorySchema,
  });
export const deleteCategory = (id: string) =>
  api(`/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE', schema: idSchema });
export const reorderCategories = (ids: string[]) =>
  api('/admin/categories/order', {
    method: 'PUT',
    body: { ids },
    schema: z.array(adminCategorySchema),
  });

export const fetchRoles = () => api('/admin/roles/permissions', { schema: rolePermissionsSchema });
export const saveRoles = (body: RolePermissions) =>
  api('/admin/roles/permissions', { method: 'PUT', body, schema: rolePermissionsSchema });

export const fetchWelcome = () => api('/admin/mail/welcome', { schema: welcomeMailSchema });
export const saveWelcome = (body: WelcomeMail) =>
  api('/admin/mail/welcome', { method: 'PUT', body, schema: welcomeMailSchema });
export const testWelcome = (to: string) =>
  api('/admin/mail/welcome/test', { method: 'POST', body: { to }, schema: sendResultSchema });

export const fetchSmtp = () => api('/admin/smtp', { schema: smtpSettingsSchema });
export type SmtpSave = Omit<z.infer<typeof smtpSettingsSchema>, 'hasKey'> & { key?: string };
export const saveSmtp = (body: SmtpSave) =>
  api('/admin/smtp', { method: 'PUT', body, schema: smtpSettingsSchema });
export const verifySmtp = (body: SmtpVerify) =>
  api('/admin/smtp/verify', { method: 'POST', body, schema: sendResultSchema });
export const testSmtp = (to: string) =>
  api('/admin/smtp/test', { method: 'POST', body: { to }, schema: sendResultSchema });

export const fetchAdmins = () =>
  api('/admin/admins', { schema: items(adminAccountSchema) }).then((r) => r.items);
export const inviteAdmin = (body: AdminInvite) =>
  api('/admin/admins/invite', { method: 'POST', body, schema: adminAccountSchema });
export const revokeAdmin = (id: string) =>
  api(`/admin/admins/${encodeURIComponent(id)}`, { method: 'DELETE', schema: idSchema });

export const fetchAuditLog = () =>
  api('/admin/audit-logs', { schema: items(auditLogRowSchema) }).then((r) => r.items);

export const fetchSecurity = () =>
  api('/admin/settings/security', { schema: securitySettingsSchema });
export const patchSecurity = (body: SecurityPatch) =>
  api('/admin/settings/security', { method: 'PATCH', body, schema: securitySettingsSchema });

export const fetchLanguages = () =>
  api('/admin/settings/languages', { schema: languageSettingsSchema });
export const patchLanguages = (body: LanguagePatch) =>
  api('/admin/settings/languages', { method: 'PATCH', body, schema: languageSettingsSchema });
