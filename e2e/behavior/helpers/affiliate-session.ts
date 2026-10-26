import { expect, type Page } from '../../server/test';
import { ADMIN_URL } from '../../urls';

export async function signInAffiliate(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/login`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto(`${origin}/affiliate`);
  await expect(
    page.getByRole('heading', { name: 'Mạng lưới Affiliate', exact: true }),
  ).toBeVisible();
}

export async function openAffiliateDetail(page: Page, code: string, name: string) {
  await page.goto(`${ADMIN_URL}/affiliate?tab=aff`);
  await page.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill(code);
  await page.getByRole('link', { name, exact: true }).click();
}
