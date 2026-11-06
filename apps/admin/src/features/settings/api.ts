import {
  adminAccountListSchema,
  adminAccountRowSchema,
  adminCategorySchema,
  adminRoleListSchema,
  adminRoleSchema,
  auditLogPageSchema,
  exportJobSchema,
  generalSettingsSchema,
  mailJobSchema,
  languageSettingsSchema,
  securitySettingsSchema,
  sendResultSchema,
  smtpSettingsSchema,
  welcomeMailSchema,
  type AdminAccountCreate,
  type AdminAccountStatus,
  type AdminRoleCreate,
  type AdminRoleMatrix,
  type GeneralSettingsPatch,
  type LanguagePatch,
  type SecurityPatch,
  type SmtpVerify,
  type WelcomeMail,
} from '@opchub/shared/api-domains';
import { adminPriceConfigSchema, type PriceConfigSave } from '@opchub/shared';
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
  price: ['admin-settings', 'price'] as const,
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

/** §21 Vai trò & phân quyền (TIP-V2-201/203) */
export const fetchRoles = () =>
  api('/admin/admin-roles', { schema: adminRoleListSchema }).then((r) => r.items);
export const saveMatrix = (body: AdminRoleMatrix) =>
  api('/admin/admin-roles/permissions', { method: 'PUT', body, schema: adminRoleListSchema });
export const createRole = (body: AdminRoleCreate) =>
  api('/admin/admin-roles', { method: 'POST', body, schema: adminRoleSchema });
export const deleteRole = (id: string) =>
  api(`/admin/admin-roles/${encodeURIComponent(id)}`, { method: 'DELETE', schema: idSchema });

export const fetchWelcome = () => api('/admin/mail/welcome', { schema: welcomeMailSchema });
export const saveWelcome = (body: WelcomeMail) =>
  api('/admin/mail/welcome', { method: 'PUT', body, schema: welcomeMailSchema });
export const testWelcome = (to: string) =>
  api('/admin/mail/welcome/test', { method: 'POST', body: { to }, schema: mailJobSchema });

export const fetchSmtp = () => api('/admin/smtp', { schema: smtpSettingsSchema });
export type SmtpSave = Omit<z.infer<typeof smtpSettingsSchema>, 'hasKey'> & { key?: string };
export const saveSmtp = (body: SmtpSave) =>
  api('/admin/smtp', { method: 'PUT', body, schema: smtpSettingsSchema });
export const verifySmtp = (body: SmtpVerify) =>
  api('/admin/smtp/verify', { method: 'POST', body, schema: sendResultSchema });
export const testSmtp = (to: string) =>
  api('/admin/smtp/test', { method: 'POST', body: { to }, schema: sendResultSchema });

/** §21 Tài khoản quản trị (RB-R02, R04, R08) */
const acc = (id: string) => `/admin/admin-accounts/${encodeURIComponent(id)}`;
export const fetchAdmins = () =>
  api('/admin/admin-accounts', { schema: adminAccountListSchema }).then((r) => r.items);
export const createAdmin = (body: AdminAccountCreate) =>
  api('/admin/admin-accounts', { method: 'POST', body, schema: adminAccountRowSchema });
export const setAdminStatus = (id: string, status: AdminAccountStatus) =>
  api(`${acc(id)}/status`, { method: 'POST', body: { status }, schema: adminAccountRowSchema });
export const setAdminRole = (id: string, roleId: string) =>
  api(`${acc(id)}/role`, { method: 'PATCH', body: { roleId }, schema: adminAccountRowSchema });
export const revokeAdmin = (id: string) => api(acc(id), { method: 'DELETE', schema: idSchema });

export const fetchAuditLog = (cursor?: string) =>
  api(`/admin/audit-logs${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
    schema: auditLogPageSchema,
  });
export const exportAuditLog = () =>
  api('/admin/audit-logs/export', { method: 'POST', schema: exportJobSchema });

export const fetchSecurity = () =>
  api('/admin/settings/security', { schema: securitySettingsSchema });
export const patchSecurity = (body: SecurityPatch) =>
  api('/admin/settings/security', { method: 'PATCH', body, schema: securitySettingsSchema });

export const fetchLanguages = () =>
  api('/admin/settings/languages', { schema: languageSettingsSchema });
export const patchLanguages = (body: LanguagePatch) =>
  api('/admin/settings/languages', { method: 'PATCH', body, schema: languageSettingsSchema });

/** D-94 5A (§27 API): Cấu hình bảng giá */
export const fetchPriceConfig = () =>
  api('/admin/price-config', { schema: adminPriceConfigSchema });
export const savePriceConfig = (body: PriceConfigSave) =>
  api('/admin/price-config', { method: 'PUT', body, schema: adminPriceConfigSchema });
