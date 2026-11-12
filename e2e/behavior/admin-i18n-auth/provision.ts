import { randomUUID } from 'node:crypto';
import { adminLoginResponseSchema, type AdminLoginResponse } from '@opchub/shared/api';
import {
  adminRoleListSchema,
  adminAccountCreateSchema,
  adminAccountRowSchema,
} from '@opchub/shared/api-domains';
import { openEnglish } from '../admin-i18n/fixtures';
import { expect, type Page, type AuthAudit } from './fixtures';
import { authLabels, type AuthLabels } from './labels';
import { PREFIX } from './protocol';

export const waitApi = (page: Page, path: string, status = 200) => {
  const pending = page
    .waitForResponse((r) => new URL(r.url()).pathname === `/v1/admin/${path}`)
    .then((response) => {
      expect(response.status(), `Exact API precondition: ${path}`).toBe(status);
      return response;
    });
  void pending.catch(() => undefined);
  return pending;
};
export async function menu(page: Page, label: string) {
  await page.locator('[data-m="me"]').click();
  await page.getByRole('menuitem', { name: label, exact: true }).click();
}
export async function signOut(page: Page, labels: AuthLabels, audit: AuthAudit) {
  const done = waitApi(page, 'auth/logout', 204);
  await menu(page, labels.shell.logout);
  await done;
  await expect(page).toHaveURL(/\/login$/);
  await audit.settle();
}
async function browserApi(page: Page, token: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ token, path, body }) => {
      const response = await fetch(`/v1/admin/${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: (await response.json()) as unknown };
    },
    { token, path, body },
  );
}
export async function provision(page: Page, audit: AuthAudit) {
  const login = waitApi(page, 'auth/login');
  await openEnglish(page, '/profile');
  const session = adminLoginResponseSchema.parse(await (await login).json());
  const roles = await browserApi(page, session.accessToken, 'admin-roles');
  expect(roles.status).toBe(200);
  const role = adminRoleListSchema.parse(roles.body).items.find((r) => r.key === 'editor');
  if (!role) throw new Error('Existing non-Super editor fixture precondition is missing');
  const key = `${PREFIX}${randomUUID()}`;
  const fixture = {
    email: `${key}@example.invalid`,
    name: key,
    roleId: role.id,
    password: `Aa1!${randomUUID()}`,
    nextPassword: `Bb2!${randomUUID()}`,
  };
  audit.protocol.register(fixture);
  const body = adminAccountCreateSchema.parse(fixture);
  // Guard ownership before the sole provisioning POST; never update/delete an existing account.
  if (!body.email.startsWith(PREFIX) || !body.name.startsWith(PREFIX))
    throw new Error('Refusing non-owned fixture creation');
  const created = await browserApi(page, session.accessToken, 'admin-accounts', body);
  expect(created.status).toBe(201);
  const row = adminAccountRowSchema.parse(created.body);
  expect(row.email).toBe(fixture.email);
  expect(row.isSuperAdmin).toBe(false);
  await audit.settle();
  await signOut(page, authLabels('en'), audit);
  return { ...fixture, id: row.id, permissions: role.permissions };
}
export type OwnedAccount = Awaited<ReturnType<typeof provision>>;
export async function signIn(page: Page, labels: AuthLabels, email: string, password: string) {
  await page.locator('input[autocomplete="username"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: labels.login.submit, exact: true }).click();
}
export function assertIdentity(session: AdminLoginResponse, owned: OwnedAccount) {
  expect(session.admin.id).toBe(owned.id);
  expect(session.admin.email).toBe(owned.email);
  expect(session.admin.roleId).toBe(owned.roleId);
  expect([...session.admin.permissions].sort()).toEqual([...owned.permissions].sort());
  expect(session.admin.isSuperAdmin).toBe(false);
}
