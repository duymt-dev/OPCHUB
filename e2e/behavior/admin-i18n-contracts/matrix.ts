import { ADMIN_PERMISSION_KEYS } from '@opchub/shared';
import { adminLoginResponseSchema } from '@opchub/shared/api';
import {
  adminRoleListSchema,
  adminRoleMatrixSchema,
  adminRoleSchema,
  type AdminRoleRow,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { openEnglish } from '../admin-i18n/fixtures';
import {
  authedJson,
  CONTRACT_ROLE_NAME,
  expect,
  readBundleJson,
  waitApiResponse,
  type ContractAudit,
  type Page,
} from './fixtures';

const accessSchema = z.object({
  roles: z.object({
    heading: z.string().min(1),
    add: z.string().min(1),
    addName: z.string().min(1),
    addDesc: z.string().min(1),
    addOk: z.string().min(1),
    confirmOk: z.string().min(1),
    cell: z.string().min(1),
    saved: z.string().min(1),
  }),
});
const coreSchema = z.object({ common: z.object({ save: z.string().min(1) }) });
const uiSchema = z.object({
  permissions: z.object({ members: z.object({ view: z.string().min(1) }) }),
});

async function ensureOwnedRole(
  page: Page,
  initialList: readonly AdminRoleRow[],
  roles: z.infer<typeof accessSchema>['roles'],
): Promise<AdminRoleRow> {
  const existing = initialList.find((r) => r.name === CONTRACT_ROLE_NAME);
  if (existing) return existing;
  await page.getByRole('button', { name: roles.add, exact: true }).click();
  await page.getByLabel(roles.addName, { exact: true }).fill(CONTRACT_ROLE_NAME);
  await page
    .getByLabel(roles.addDesc, { exact: true })
    .fill('tip824 canonical permission matrix verification');
  const createdRes = waitApiResponse(page, '/v1/admin/admin-roles', 'POST', 201);
  const refreshedList = waitApiResponse(page, '/v1/admin/admin-roles', 'GET', 200);
  await page.getByRole('button', { name: roles.addOk, exact: true }).click();
  const created = adminRoleSchema.parse(await (await createdRes).json());
  await refreshedList;
  return created;
}

export async function verifyRoleMatrixSave(page: Page, audit: ContractAudit) {
  const enAccess = accessSchema.parse(readBundleJson('en', 'settings/access'));
  const enCore = coreSchema.parse(readBundleJson('en', 'settings/core'));
  const enUi = uiSchema.parse(readBundleJson('en', 'ui'));

  const loginDone = waitApiResponse(page, '/v1/admin/auth/login', 'POST', 200);
  const rolesLoaded = waitApiResponse(page, '/v1/admin/admin-roles', 'GET', 200);
  await openEnglish(page, '/settings?tab=roles');
  const session = adminLoginResponseSchema.parse(await (await loginDone).json());
  const initialList = adminRoleListSchema.parse(await (await rolesLoaded).json()).items;
  await expect(page.getByText(enAccess.roles.heading, { exact: true }).first()).toBeVisible();

  const preExistingSnapshot = new Map<string, string[]>();
  for (const r of initialList) {
    if (r.name !== CONTRACT_ROLE_NAME) preExistingSnapshot.set(r.id, [...r.permissions].sort());
  }

  const owned = await ensureOwnedRole(page, initialList, enAccess.roles);
  expect(owned.name).toBe(CONTRACT_ROLE_NAME);
  expect(owned.isSystem).toBe(false);
  expect(owned.accountCount).toBe(0);

  const cellLabel = enAccess.roles.cell
    .replace('{perm}', enUi.permissions.members.view)
    .replace('{role}', CONTRACT_ROLE_NAME);
  const cell = page.getByRole('checkbox', { name: cellLabel, exact: true });
  await expect(cell).toBeVisible();
  const wasChecked = (await cell.getAttribute('aria-checked')) === 'true';
  await cell.click();
  await expect(cell).toHaveAttribute('aria-checked', String(!wasChecked));

  await page.getByRole('button', { name: enCore.common.save, exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  const saveRes = waitApiResponse(page, '/v1/admin/admin-roles/permissions', 'PUT', 200);
  await dialog.getByRole('button', { name: enAccess.roles.confirmOk, exact: true }).click();
  const putResponse = await saveRes;

  const sentPayload = adminRoleMatrixSchema.parse(putResponse.request().postDataJSON());
  for (const perms of Object.values(sentPayload)) {
    for (const key of perms) expect(ADMIN_PERMISSION_KEYS).toContain(key);
  }
  const ownedSent = [...(sentPayload[owned.id] ?? [])].sort();
  if (!wasChecked) expect(ownedSent).toContain('members.view');
  else expect(ownedSent).not.toContain('members.view');

  for (const [roleId, beforePerms] of preExistingSnapshot.entries()) {
    if (roleId in sentPayload) {
      expect([...(sentPayload[roleId] ?? [])].sort()).toEqual(beforePerms);
    }
  }

  await expect(
    page.getByRole('status').filter({ hasText: enAccess.roles.saved }).first(),
  ).toBeVisible();

  const readback = await authedJson(page, session.accessToken, '/v1/admin/admin-roles');
  expect(readback.status).toBe(200);
  const readbackItems = adminRoleListSchema.parse(readback.body).items;
  for (const [roleId, beforePerms] of preExistingSnapshot.entries()) {
    const afterRole = readbackItems.find((r) => r.id === roleId);
    expect([...(afterRole?.permissions ?? [])].sort()).toEqual(beforePerms);
  }
  expect([...(readbackItems.find((r) => r.id === owned.id)?.permissions ?? [])].sort()).toEqual(
    ownedSent,
  );
  await audit.settle();
}
