import { expect, type Page } from '../server/test';
import { PORTAL_URL } from '../urls';

export const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

export async function login(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

export async function openProjects(page: Page) {
  await login(page);
  await page.locator('aside').getByText('Dự án OPC', { exact: true }).click();
  await expect(page.getByText('Sáng kiến & Giải pháp cho địa phương')).toBeVisible();
}

export async function openDetail(page: Page, name: string) {
  await openProjects(page);
  await page.getByText(name, { exact: true }).last().click();
  await expect(page.getByText('Giới thiệu dự án')).toBeVisible();
}
