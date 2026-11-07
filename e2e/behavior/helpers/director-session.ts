import { expect, type Page } from '../../server/test';
import { PORTAL_URL } from '../../urls';

/** Same seeded regional-director identity in MSW and the isolated native runtime. */
export async function directorSession(page: Page): Promise<void> {
  await page.goto(`${PORTAL_URL}/login`);
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('bao.tran@solobooks.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/dashboard$/);
  await expect(page.getByText('Hướng dẫn bắt đầu', { exact: true })).toBeVisible();
}
