import { randomUUID } from 'node:crypto';
import {
  adminLoginResponseSchema,
  apiErrorSchema,
  type AdminLoginResponse,
} from '@opchub/shared/api';
import {
  adminAccountCreateSchema,
  adminAccountRowSchema,
  adminMemberPageSchema,
  adminRoleListSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { openEnglish } from '../admin-i18n/fixtures';
import { assertViewport, selectLocale } from '../admin-i18n/navigation';
import { authLabels } from '../admin-i18n-auth/labels';
import {
  authedJson,
  CONTRACT_ACCOUNT_PREFIX,
  expect,
  readBundleJson,
  waitApiResponse,
  type ContractAudit,
  type Page,
} from './fixtures';

const commonSchema = z.object({
  rbac: z.object({
    viewOnly: z.string().min(1),
    viewOnlyToast: z.string().min(1),
    forbiddenTitle: z.string().min(1),
    forbiddenBody: z.string().min(1),
    forbiddenBack: z.string().min(1),
  }),
  shell: z.object({ logout: z.string().min(1) }),
});
const membersSchema = z.object({
  bulk: z.object({ export: z.string().min(1) }),
  card: z.object({ search: z.string().min(1) }),
  col: z.object({ select: z.string().min(1) }),
});

function stripTags(template: string, role: string): string {
  return template.replace(/<\/?b>/g, '').replace('{role}', role);
}

async function provisionLecturerSession(
  page: Page,
  logoutLabel: string,
): Promise<{ session: AdminLoginResponse; defaultRoleName: string }> {
  const superLogin = waitApiResponse(page, '/v1/admin/auth/login', 'POST', 200);
  await openEnglish(page, '/profile');
  const superSession = adminLoginResponseSchema.parse(await (await superLogin).json());

  const rolesRes = await authedJson(page, superSession.accessToken, '/v1/admin/admin-roles');
  expect(rolesRes.status).toBe(200);
  const lecturer = adminRoleListSchema.parse(rolesRes.body).items.find((r) => r.key === 'lecturer');
  if (!lecturer) throw new Error('Missing built-in lecturer role precondition');

  const key = `${CONTRACT_ACCOUNT_PREFIX}${randomUUID()}`;
  const tempPassword = `Aa1!${randomUUID()}`;
  const nextPassword = `Bb2!${randomUUID()}`;
  const createPayload = adminAccountCreateSchema.parse({
    email: `${key}@example.invalid`,
    name: key,
    roleId: lecturer.id,
    password: tempPassword,
  });
  const created = await authedJson(
    page,
    superSession.accessToken,
    '/v1/admin/admin-accounts',
    createPayload,
  );
  expect(created.status).toBe(201);
  const account = adminAccountRowSchema.parse(created.body);
  expect(account.isSuperAdmin).toBe(false);

  const logoutDone = waitApiResponse(page, '/v1/admin/auth/logout', 'POST', 204);
  await page.locator('[data-m="me"]').click();
  await page.getByRole('menuitem', { name: logoutLabel, exact: true }).click();
  await logoutDone;
  await expect(page).toHaveURL(/\/login$/);

  const enAuth = authLabels('en');
  const firstLogin = waitApiResponse(page, '/v1/admin/auth/login', 'POST', 200);
  await page.locator('input[autocomplete="username"]').fill(account.email);
  await page.locator('input[type="password"]').fill(tempPassword);
  await page.getByRole('button', { name: enAuth.login.submit, exact: true }).click();
  await firstLogin;
  await expect(page).toHaveURL(/\/first-password$/);

  const dialog = page.getByRole('dialog', { name: enAuth.firstPassword.title, exact: true });
  await dialog.locator('input[autocomplete="new-password"]').nth(0).fill(nextPassword);
  await dialog.locator('input[autocomplete="new-password"]').nth(1).fill(nextPassword);
  const changed = waitApiResponse(page, '/v1/admin/auth/first-password', 'POST', 200);
  await dialog.getByRole('button', { name: enAuth.firstPassword.submit, exact: true }).click();
  const roSession = adminLoginResponseSchema.parse(await (await changed).json());
  expect(roSession.admin.id).toBe(account.id);
  expect(roSession.admin.isSuperAdmin).toBe(false);
  await expect(page).toHaveURL(/\/overview$/);
  return { session: roSession, defaultRoleName: lecturer.name };
}

export async function verifyRestrictedAccount(page: Page, audit: ContractAudit) {
  const enCommon = commonSchema.parse(readBundleJson('en', 'common'));
  const myCommon = commonSchema.parse(readBundleJson('my', 'common'));
  const enMembers = membersSchema.parse(readBundleJson('en', 'members'));
  const myMembers = membersSchema.parse(readBundleJson('my', 'members'));

  const { session: roSession, defaultRoleName } = await provisionLecturerSession(
    page,
    enCommon.shell.logout,
  );

  const deniedApi = await authedJson(page, roSession.accessToken, '/v1/admin/admin-roles');
  expect(deniedApi.status).toBe(403);
  const deniedErr = apiErrorSchema.parse(deniedApi.body);
  expect(deniedErr.error.code).toBe('FORBIDDEN');
  expect(deniedErr.error.message).toMatch(/[àáâãèéêìíòóôõùúýăđĩũơư\u1ea0-\u1ef9]/iu);

  const membersRes = waitApiResponse(page, '/v1/admin/users', 'GET', 200);
  await page.locator('aside a[href="/members"]').click();
  await expect(page).toHaveURL(/\/members$/);
  const firstMember = adminMemberPageSchema.parse(await (await membersRes).json()).items[0];
  if (!firstMember) throw new Error('Expected at least one member row on /members');

  const roleName = roSession.admin.roleName ?? defaultRoleName;
  const zone = page.locator('[data-view-only="1"]');
  await expect(zone).toBeVisible();
  await expect(
    zone.getByRole('status').filter({ hasText: stripTags(enCommon.rbac.viewOnly, roleName) }),
  ).toBeVisible();

  await page
    .getByRole('checkbox', {
      name: enMembers.col.select.replace('{name}', firstMember.fullName),
      exact: true,
    })
    .click();
  await zone.getByRole('button', { name: enMembers.bulk.export, exact: true }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: enCommon.rbac.viewOnlyToast.replace('{role}', roleName) }),
  ).toBeVisible();
  expect(audit.mutations.filter((m) => m.includes('/users'))).toEqual([]);

  await page.getByPlaceholder(enMembers.card.search, { exact: true }).fill(firstMember.fullName);
  await expect(page).toHaveURL(/q=/);

  await selectLocale(page, 'my');
  await expect(
    zone.getByRole('status').filter({ hasText: stripTags(myCommon.rbac.viewOnly, roleName) }),
  ).toBeVisible();
  await zone.getByRole('button', { name: myMembers.bulk.export, exact: true }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: myCommon.rbac.viewOnlyToast.replace('{role}', roleName) }),
  ).toBeVisible();
  expect(audit.mutations.filter((m) => m.includes('/users'))).toEqual([]);
  await assertViewport(page);

  await page.evaluate(() => window.history.pushState(null, '', '/fees'));
  await expect(
    page.getByRole('heading', { name: myCommon.rbac.forbiddenTitle, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(myCommon.rbac.forbiddenBody, { exact: true })).toBeVisible();
  await selectLocale(page, 'en');
  await expect(
    page.getByRole('heading', { name: enCommon.rbac.forbiddenTitle, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: enCommon.rbac.forbiddenBack, exact: true }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await audit.settle();
}
