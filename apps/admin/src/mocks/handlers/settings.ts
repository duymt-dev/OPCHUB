import { bankHandlers } from './bank-reconcile';
import type { AdminPermissionKey } from '@opchub/shared';
import {
  adminAccountCreateSchema,
  adminAccountRoleSchema,
  adminAccountStatusSchema,
  adminRoleCreateSchema,
  adminRoleMatrixSchema,
  categoryOrderSchema,
  categoryPatchSchema,
  categoryUpsertSchema,
  generalSettingsPatchSchema,
  languagePatchSchema,
  securityPatchSchema,
  smtpVerifySchema,
} from '@opchub/shared/api-domains';
import { members } from '@opchub/shared/fixtures';
import {
  createAdminCategory,
  createMockAdmin,
  createMockRole,
  deleteAdminCategory,
  deleteMockRole,
  getGeneralSettings,
  getLanguageSettings,
  getSecuritySettings,
  listAdminCategories,
  listMockAdminAccounts,
  listMockAdminRoles,
  listSettingsLog,
  mockAdminMeOf,
  reorderCategories,
  revokeMockAdmin,
  saveMockMatrix,
  setCategoryEnabled,
  setMockAdminRole,
  setMockAdminStatus,
  updateAdminCategory,
  updateGeneralSettings,
  updateLanguageSettings,
  updateSecuritySettings,
  verifySmtp,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, reply, userIdOf } from './domain-util';
import { API, apiError } from './util';
import { renewalHandlers } from './renewal';

/**
 * Admin "Cài đặt & Phân quyền" (G6a, §21). Đặt trước admin-system để thay bản cơ bản của
 * /admin/categories. Kiểm quyền theo 25 khoá của TK quản trị MSW (như `@RequireAdmin` server).
 */

const can = (request: Request, key: AdminPermissionKey) =>
  mockAdminMeOf(userIdOf(request))?.permissions.includes(key) ?? false;
const forbidden = () => apiError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');
const memberEmails = members.map((m) => m.email.toLowerCase());

export const settingsHandlers = [
  ...bankHandlers,
  ...renewalHandlers,
  http.get(`${API}/admin/settings/general`, () => HttpResponse.json(getGeneralSettings())),
  http.patch(`${API}/admin/settings/general`, async ({ request }) => {
    if (!can(request, 'settings.general')) return forbidden();
    const b = await parseBody(request, generalSettingsPatchSchema);
    return b.ok ? HttpResponse.json(updateGeneralSettings(userIdOf(request), b.data)) : b.res;
  }),

  http.get(`${API}/admin/categories`, () => HttpResponse.json({ items: listAdminCategories() })),
  http.post(`${API}/admin/categories`, async ({ request }) => {
    const b = await parseBody(request, categoryUpsertSchema);
    return b.ok ? reply(createAdminCategory(userIdOf(request), b.data), 201) : b.res;
  }),
  http.put(`${API}/admin/categories/order`, async ({ request }) => {
    const b = await parseBody(request, categoryOrderSchema);
    return b.ok ? reply(reorderCategories(userIdOf(request), b.data.ids)) : b.res;
  }),
  http.put(`${API}/admin/categories/:id`, async ({ request, params }) => {
    const b = await parseBody(request, categoryUpsertSchema);
    if (!b.ok) return b.res;
    return reply(updateAdminCategory(userIdOf(request), param(params, 'id'), b.data));
  }),
  http.patch(`${API}/admin/categories/:id`, async ({ request, params }) => {
    const b = await parseBody(request, categoryPatchSchema);
    if (!b.ok) return b.res;
    return reply(setCategoryEnabled(userIdOf(request), param(params, 'id'), b.data.enabled));
  }),
  http.delete(`${API}/admin/categories/:id`, ({ request, params }) =>
    reply(deleteAdminCategory(userIdOf(request), param(params, 'id'))),
  ),

  http.post(`${API}/admin/smtp/verify`, async ({ request }) => {
    const b = await parseBody(request, smtpVerifySchema);
    return b.ok ? HttpResponse.json(verifySmtp(userIdOf(request), b.data)) : b.res;
  }),

  // §21 RB-R04 → R08: vai trò & TK quản trị — mọi route cần `settings.admins`
  ...['admin-roles', 'admin-accounts'].map((p) =>
    http.all(`${API}/admin/${p}*`, ({ request }) =>
      can(request, 'settings.admins') ? undefined : forbidden(),
    ),
  ),
  http.get(`${API}/admin/admin-roles`, () => HttpResponse.json({ items: listMockAdminRoles() })),
  http.post(`${API}/admin/admin-roles`, async ({ request }) => {
    const b = await parseBody(request, adminRoleCreateSchema);
    if (!b.ok) return b.res;
    return reply(createMockRole(userIdOf(request), b.data.name, b.data.description), 201);
  }),
  http.put(`${API}/admin/admin-roles/permissions`, async ({ request }) => {
    const b = await parseBody(request, adminRoleMatrixSchema);
    return b.ok ? reply(saveMockMatrix(userIdOf(request), b.data)) : b.res;
  }),
  http.delete(`${API}/admin/admin-roles/:id`, ({ request, params }) =>
    reply(deleteMockRole(userIdOf(request), param(params, 'id'))),
  ),
  http.get(`${API}/admin/admin-accounts`, () =>
    HttpResponse.json({ items: listMockAdminAccounts() }),
  ),
  http.post(`${API}/admin/admin-accounts`, async ({ request }) => {
    const b = await parseBody(request, adminAccountCreateSchema);
    if (!b.ok) return b.res;
    return reply(createMockAdmin(userIdOf(request), b.data, memberEmails), 201);
  }),
  http.post(`${API}/admin/admin-accounts/:id/status`, async ({ request, params }) => {
    const b = await parseBody(request, adminAccountStatusSchema);
    if (!b.ok) return b.res;
    return reply(setMockAdminStatus(userIdOf(request), param(params, 'id'), b.data.status));
  }),
  http.patch(`${API}/admin/admin-accounts/:id/role`, async ({ request, params }) => {
    const b = await parseBody(request, adminAccountRoleSchema);
    if (!b.ok) return b.res;
    return reply(setMockAdminRole(userIdOf(request), param(params, 'id'), b.data.roleId));
  }),
  http.delete(`${API}/admin/admin-accounts/:id`, ({ request, params }) =>
    reply(revokeMockAdmin(userIdOf(request), param(params, 'id'))),
  ),

  http.get(`${API}/admin/audit-logs`, ({ request }) =>
    can(request, 'settings.log') ? HttpResponse.json({ items: listSettingsLog() }) : forbidden(),
  ),

  http.get(`${API}/admin/settings/security`, () => HttpResponse.json(getSecuritySettings())),
  http.patch(`${API}/admin/settings/security`, async ({ request }) => {
    if (!can(request, 'settings.general')) return forbidden();
    const b = await parseBody(request, securityPatchSchema);
    return b.ok ? HttpResponse.json(updateSecuritySettings(userIdOf(request), b.data)) : b.res;
  }),
  http.get(`${API}/admin/settings/languages`, () => HttpResponse.json(getLanguageSettings())),
  http.patch(`${API}/admin/settings/languages`, async ({ request }) => {
    if (!can(request, 'settings.general')) return forbidden();
    const b = await parseBody(request, languagePatchSchema);
    return b.ok ? reply(updateLanguageSettings(userIdOf(request), b.data)) : b.res;
  }),
];
