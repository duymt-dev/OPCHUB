import { adminLoginResponseSchema } from '@opchub/shared/api';
import { selectLocale } from '../admin-i18n/navigation';
import type { ControlLocale } from '../admin-i18n/control-labels';
import { expect, type Page, type AuthAudit } from './fixtures';
import { authLabels } from './labels';
import { signIn, waitApi, assertIdentity, type OwnedAccount } from './provision';
import { authImage } from './images';

export async function firstPassword(
  page: Page,
  audit: AuthAudit,
  account: OwnedAccount,
  locale: ControlLocale,
  width: number,
) {
  await selectLocale(page, locale);
  const labels = authLabels(locale);
  const login = waitApi(page, 'auth/login');
  await signIn(page, labels, account.email, account.password);
  const initial = adminLoginResponseSchema.parse(await (await login).json());
  assertIdentity(initial, account);
  expect(initial.admin.mustChangePassword).toBe(true);
  await expect(page).toHaveURL(/\/first-password$/);
  const dialog = page.getByRole('dialog', { name: labels.firstPassword.title, exact: true });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveTitle(`${labels.meta.firstPassword} · OPC Hub Admin`);
  await authImage(page, locale, 'first-password', width);
  await expect(page.locator('[inert][aria-hidden]')).toHaveCount(1);
  const password = () => dialog.locator('input[autocomplete="new-password"]').nth(0);
  const confirm = () => dialog.locator('input[autocomplete="new-password"]').nth(1);
  await expect(password()).toHaveAccessibleName(labels.firstPassword.newPassword);
  await expect(confirm()).toHaveAccessibleName(labels.firstPassword.confirm);
  await password().fill('weak');
  await confirm().fill('weak');
  await dialog.getByRole('button', { name: labels.firstPassword.submit, exact: true }).click();
  await expect(dialog.getByText(labels.errors.adminPasswordRule, { exact: true })).toBeVisible();
  // Explicit provider-refresh robustness probe: modal covers selector, NOT pointer-access proof.
  const alternate = locale === 'en' ? 'vi' : 'en';
  await selectLocale(page, alternate, 'covered-handler');
  const other = authLabels(alternate);
  await expect(
    page.getByRole('dialog').getByText(other.errors.adminPasswordRule, { exact: true }),
  ).toBeVisible();
  await expect(page.locator('input[autocomplete="new-password"]').first()).toHaveValue('weak');
  await selectLocale(page, locale, 'covered-handler');
  await password().fill(account.nextPassword);
  await confirm().fill(account.nextPassword + 'x');
  await dialog.getByRole('button', { name: labels.firstPassword.submit, exact: true }).click();
  await expect(dialog.getByText(labels.errors.passwordMismatch, { exact: true })).toBeVisible();
  expect(audit.protocol.counts.get('auth/first-password')).toBeUndefined();
  const rect = await dialog.boundingBox();
  if (!rect) throw new Error('Missing first-password dialog geometry');
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(width);
  await confirm().fill(account.nextPassword);
  const changed = waitApi(page, 'auth/first-password');
  await dialog.getByRole('button', { name: labels.firstPassword.submit, exact: true }).click();
  const session = adminLoginResponseSchema.parse(await (await changed).json());
  assertIdentity(session, account);
  expect(session.admin.mustChangePassword).toBe(false);
  expect(session.admin.twoFactorRequired).toBe(false);
  await expect(page).toHaveURL(/\/overview$/);
  await audit.settle();
}
