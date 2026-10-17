import { hasPermission, type PermissionKey } from '@opchub/shared';
import {
  adminInviteSchema,
  categoryOrderSchema,
  categoryPatchSchema,
  categoryUpsertSchema,
  generalSettingsPatchSchema,
  languagePatchSchema,
  rolePermissionsSchema,
  securityPatchSchema,
  smtpVerifySchema,
} from '@opchub/shared/api-domains';
import {
  createAdminCategory,
  deleteAdminCategory,
  getGeneralSettings,
  getLanguageSettings,
  getSecuritySettings,
  inviteAdmin,
  listAdminAccounts,
  listAdminCategories,
  listSettingsLog,
  mockDb,
  reorderCategories,
  revokeAdmin,
  saveRolePermissions,
  setCategoryEnabled,
  updateAdminCategory,
  updateGeneralSettings,
  updateLanguageSettings,
  updateSecuritySettings,
  verifySmtp,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, parseBody, reply, userIdOf } from './domain-util';
import { API, apiError } from './util';

/**
 * Admin "Cài đặt & Phân quyền" (G6a, D-66 → D-77). Đặt trước admin-system để thay bản cơ bản
 * của /admin/categories và PUT /admin/roles/permissions (thêm số dùng, thứ tự, audit, kiểm
 * quyền `s.role`). Endpoint ngoài SRS §13 ghi ở Q-G6a-1. Mọi thao tác ghi → audit_logs.
 */

/** TK mock 'admin' là Super Admin; người khác coi là thành viên thường */
const can = (request: Request, key: PermissionKey) =>
  hasPermission(
    userIdOf(request) === 'admin' ? 'super_admin' : 'member',
    key,
    mockDb().rolePermissions,
  );
const forbidden = () => apiError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');

export const settingsHandlers = [
  http.get(`${API}/admin/settings/general`, () => HttpResponse.json(getGeneralSettings())),
  http.patch(`${API}/admin/settings/general`, async ({ request }) => {
    if (!can(request, 's.cfg')) return forbidden();
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

  // D-42: đổi quyền cần `s.role`
  http.put(`${API}/admin/roles/permissions`, async ({ request }) => {
    if (!can(request, 's.role')) return forbidden();
    const b = await parseBody(request, rolePermissionsSchema);
    return b.ok ? HttpResponse.json(saveRolePermissions(userIdOf(request), b.data)) : b.res;
  }),

  http.post(`${API}/admin/smtp/verify`, async ({ request }) => {
    const b = await parseBody(request, smtpVerifySchema);
    return b.ok ? HttpResponse.json(verifySmtp(userIdOf(request), b.data)) : b.res;
  }),

  http.get(`${API}/admin/admins`, () => HttpResponse.json({ items: listAdminAccounts() })),
  http.post(`${API}/admin/admins/invite`, async ({ request }) => {
    if (!can(request, 's.role')) return forbidden();
    const b = await parseBody(request, adminInviteSchema);
    return b.ok ? reply(inviteAdmin(userIdOf(request), b.data), 201) : b.res;
  }),
  http.delete(`${API}/admin/admins/:id`, ({ request, params }) => {
    if (!can(request, 's.role')) return forbidden();
    return reply(revokeAdmin(userIdOf(request), param(params, 'id')));
  }),

  http.get(`${API}/admin/audit-logs`, () => HttpResponse.json({ items: listSettingsLog() })),

  http.get(`${API}/admin/settings/security`, () => HttpResponse.json(getSecuritySettings())),
  http.patch(`${API}/admin/settings/security`, async ({ request }) => {
    if (!can(request, 's.cfg')) return forbidden();
    const b = await parseBody(request, securityPatchSchema);
    return b.ok ? HttpResponse.json(updateSecuritySettings(userIdOf(request), b.data)) : b.res;
  }),
  http.get(`${API}/admin/settings/languages`, () => HttpResponse.json(getLanguageSettings())),
  http.patch(`${API}/admin/settings/languages`, async ({ request }) => {
    if (!can(request, 's.cfg')) return forbidden();
    const b = await parseBody(request, languagePatchSchema);
    return b.ok ? reply(updateLanguageSettings(userIdOf(request), b.data)) : b.res;
  }),
];
