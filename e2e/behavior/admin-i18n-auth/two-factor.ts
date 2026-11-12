import { adminLoginResponseSchema, adminTwoFactorSetupSchema } from '@opchub/shared/api';
import { selectLocale } from '../admin-i18n/navigation';
import type { ControlLocale } from '../admin-i18n/control-labels';
import { expect, type Page, type AuthAudit } from './fixtures';
import { authLabels } from './labels';
import { menu, signOut, signIn, waitApi, assertIdentity, type OwnedAccount } from './provision';
import { totp } from './totp';
import { authImage } from './images';

async function fillOtp(page: Page, label: string, error: string, uri: string, used?: string) {
  // Avoid sending the preceding30-second time-step at its final network-boundary moments.
  const remaining = 30000 - (Date.now() % 30000);
  // Native marks the setup code used for90s: wait for the next real code, do not replay it.
  if (remaining < 4000 || totp(uri) === used) await page.waitForTimeout(remaining + 100);
  const input = page.locator('input[autocomplete="one-time-code"]');
  await expect(input).toHaveAccessibleName(`${label} ${error}`);
  const code = totp(uri);
  await input.fill(code);
  return code;
}
export async function twoFactor(
  page: Page,
  audit: AuthAudit,
  account: OwnedAccount,
  locale: ControlLocale,
) {
  const labels = authLabels(locale);
  await menu(page, labels.shell.profile);
  await expect(page).toHaveURL(/\/profile$/);
  const setup = waitApi(page, 'auth/2fa/setup');
  await page.getByRole('button', { name: labels.adminProfile.enable, exact: true }).click();
  const data = adminTwoFactorSetupSchema.parse(await (await setup).json());
  await expect(page).toHaveURL(/\/two-factor$/);
  await expect(page).toHaveTitle(`${labels.meta.twoFactor} · OPC Hub Admin`);
  await expect(
    page.getByRole('heading', { name: labels.twoFactor.title, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(labels.twoFactor.subOptional, { exact: true })).toBeVisible();
  const uri = (await page.getByTestId('totp-uri').textContent()) ?? '';
  expect(uri === data.otpauthUrl, 'UI retains raw setup URI without translating secret').toBe(true);
  await page.getByLabel(labels.twoFactor.code, { exact: true }).fill('123');
  await page.getByRole('button', { name: labels.twoFactor.submit, exact: true }).click();
  await expect(page.getByText(labels.totp.errCode, { exact: true })).toBeVisible();
  const alternate = locale === 'en' ? 'vi' : 'en';
  await selectLocale(page, alternate);
  const other = authLabels(alternate);
  await expect(page.getByText(other.totp.errCode, { exact: true })).toBeVisible();
  const input = page.locator('input[autocomplete="one-time-code"]');
  await expect(input).toHaveAccessibleName(`${other.twoFactor.code} ${other.totp.errCode}`);
  await expect(input).toHaveValue('123');
  expect((await page.getByTestId('totp-uri').textContent()) === uri).toBe(true);
  await selectLocale(page, locale);
  expect(audit.protocol.counts.get('auth/2fa/enable')).toBeUndefined();
  const setupCode = await fillOtp(page, labels.twoFactor.code, labels.totp.errCode, uri);
  const enabled = waitApi(page, 'auth/2fa/enable');
  await page.getByRole('button', { name: labels.twoFactor.submit, exact: true }).click();
  const session = adminLoginResponseSchema.parse(await (await enabled).json());
  assertIdentity(session, account);
  expect(session.admin.twoFactor).toBe(true);
  await expect(page).toHaveURL(/\/overview$/);
  await audit.settle();
  await signOut(page, labels, audit);
  const challenge = waitApi(page, 'auth/login', 401);
  await signIn(page, labels, account.email, account.nextPassword);
  await challenge;
  await audit.settle();
  await expect(page.getByRole('heading', { name: labels.totp.title, exact: true })).toBeVisible();
  await expect(page).toHaveTitle(`${labels.meta.login} · OPC Hub Admin`);
  await authImage(page, locale, 'mfa', page.viewportSize()?.width ?? 0);
  await page.getByLabel(labels.totp.code, { exact: true }).fill('123');
  await page.getByRole('button', { name: labels.totp.submit, exact: true }).click();
  await expect(page.getByText(labels.totp.errCode, { exact: true })).toBeVisible();
  expect(audit.protocol.counts.get('auth/totp/verify')).toBeUndefined();
  await fillOtp(page, labels.totp.code, labels.totp.errCode, uri, setupCode);
  const verified = waitApi(page, 'auth/totp/verify');
  await page.getByRole('button', { name: labels.totp.submit, exact: true }).click();
  const final = adminLoginResponseSchema.parse(await (await verified).json());
  assertIdentity(final, account);
  expect(final.admin.twoFactor).toBe(true);
  await expect(page).toHaveURL(/\/overview$/);
  await menu(page, labels.shell.profile);
  await expect(page.getByLabel(labels.adminProfile.email, { exact: true })).toHaveValue(
    account.email,
  );
  await expect(page.getByText(labels.adminProfile.enabled, { exact: true })).toBeVisible();
}
