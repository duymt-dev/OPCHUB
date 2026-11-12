import { ADMIN_URL } from '../../urls';
import { selectLocale } from '../admin-i18n/navigation';
import type { ControlLocale } from '../admin-i18n/control-labels';
import { expect, type Page } from './fixtures';
import { passwordLabels } from './labels';
import { passwordImage } from './images';

export async function forgotLocal(page: Page, locale: ControlLocale) {
  const t = passwordLabels(locale);
  await page.getByRole('button', { name: t.login.forgot, exact: true }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page).toHaveTitle(`${t.meta.forgotPassword} · OPC Hub Admin`);
  await expect(page.getByRole('heading', { name: t.forgot.title, exact: true })).toBeVisible();
  await expect(page.getByText(t.forgot.sub, { exact: true })).toBeVisible();
  const input = page.locator('input[type="email"]');
  await expect(input).toHaveAccessibleName(t.login.email);
  await input.fill('not-an-email');
  await page.getByRole('button', { name: t.forgot.submit, exact: true }).click();
  await expect(page.locator('[data-admin-auth-font]').getByRole('alert')).toHaveText(
    t.forgot.errEmail,
  );
  const alternate = locale === 'en' ? 'vi' : 'en';
  await selectLocale(page, alternate);
  await expect(input).toHaveValue('not-an-email');
  await expect(page.locator('[data-admin-auth-font]').getByRole('alert')).toHaveText(
    passwordLabels(alternate).forgot.errEmail,
  );
  await selectLocale(page, locale);
  await expect(page.locator('[data-admin-auth-font]').getByRole('alert')).toHaveText(
    t.forgot.errEmail,
  );
  await input.fill('');
  await passwordImage(page, locale, 'forgot');
}

export async function resetLocal(page: Page, locale: ControlLocale) {
  const t = passwordLabels(locale);
  // Deliberately invalid, non-secret token. Never submit matching passwords or call reset API.
  await page.goto(`${ADMIN_URL}/reset-password?token=tip824-local-only#preserved`);
  await expect(page).toHaveTitle(`${t.meta.resetPassword} · OPC Hub Admin`);
  await expect(page.getByRole('heading', { name: t.reset.title, exact: true })).toBeVisible();
  await expect(page.getByText(t.reset.sub, { exact: true })).toBeVisible();
  const submit = () => page.getByRole('button', { name: t.reset.submit, exact: true });
  await submit().click();
  await expect(page.locator('[data-admin-auth-font]').getByRole('alert')).toHaveText(
    t.reset.errEmpty,
  );
  const input = page.locator('input[type="password"]');
  await expect(input).toHaveCount(2);
  await input.nth(0).fill('local-draft-only');
  await input.nth(1).fill('different-local-draft');
  await submit().click();
  await expect(page.locator('[data-admin-auth-font]').getByRole('alert')).toHaveText(
    t.reset.errMismatch,
  );
  const alternate = locale === 'en' ? 'vi' : 'en';
  await selectLocale(page, alternate);
  await expect(page.locator('[data-admin-auth-font]').getByRole('alert')).toHaveText(
    passwordLabels(alternate).reset.errMismatch,
  );
  await expect(input.nth(0)).toHaveValue('local-draft-only');
  await expect(input.nth(1)).toHaveValue('different-local-draft');
  await selectLocale(page, locale);
  await expect(page.locator('[data-admin-auth-font]').getByRole('alert')).toHaveText(
    t.reset.errMismatch,
  );
  await expect(page).toHaveURL(`${ADMIN_URL}/reset-password?token=tip824-local-only#preserved`);
}

export async function missingToken(page: Page, locale: ControlLocale) {
  const t = passwordLabels(locale);
  await page.goto(`${ADMIN_URL}/reset-password?source=tip824#preserved`);
  await expect(page.locator('[data-admin-auth-font]').getByRole('alert')).toHaveText(
    t.reset.missingToken,
  );
  await expect(page.locator('input')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page).toHaveTitle(`${t.meta.resetPassword} · OPC Hub Admin`);
  await expect(page.locator('[data-admin-auth-font]').getByRole('alert')).toHaveText(
    t.reset.missingToken,
  );
  await expect(page).toHaveURL(`${ADMIN_URL}/reset-password?source=tip824#preserved`);
  await passwordImage(page, locale, 'reset');
  await page.getByRole('button', { name: t.reset.resend, exact: true }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.getByRole('button', { name: t.forgot.back, exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
}
