import { expect, test } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import type { Page } from '../server/test';

async function login(page: Page, admin = false) {
  await page.goto(`${admin ? ADMIN_URL : PORTAL_URL}/login`);
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill(admin ? 'admin@opchub.community' : 'an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill(admin ? 'Admin@2026' : 'User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

/** Identical user actions and assertions in MSW and native lanes. */
for (const admin of [false, true]) {
  test(`${admin ? 'Admin' : 'Portal'} BR-491 topbar searches across domains without changing current page`, async ({
    page,
  }) => {
    await login(page, admin);
    const start = page.url();
    const search = page.getByRole('combobox', { name: /^Tìm (gian hàng|thành viên)/ });
    await expect(search).toBeVisible();
    await search.fill('m');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await search.fill('MediaSoft');
    const list = page.getByRole('listbox');
    await expect(list.getByRole('option').first()).toContainText('MediaSoft');
    await expect(page).toHaveURL(start);
    await page.locator('main').click({ position: { x: 10, y: 10 } });
    await expect(list).toHaveCount(0);
    await expect(search).toHaveValue('MediaSoft');
    await search.focus();
    await expect(list).toBeVisible();
    await search.press('Escape');
    await expect(search).toHaveValue('');
    await expect(list).toHaveCount(0);
    await search.fill('zzqxnotfound');
    await expect(list).toHaveText('Không tìm thấy kết quả');
    await search.press('Enter');
    await expect(page).toHaveURL(start);
    await search.fill('MediaSoft');
    await expect(list.getByRole('option').first()).toContainText('MediaSoft');
    await search.press('Enter');
    await expect(page).toHaveURL(admin ? /\/stores\?q=/ : /\/stores\/st1$/);
    await expect(search).toHaveValue('');
    await page.setViewportSize({ width: 1023, height: 900 });
    await expect(search).toBeHidden();
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(search).toBeVisible();
  });
}

test('Portal BR-491 group target: joined opens chat, unjoined opens join dialog', async ({
  page,
}) => {
  await login(page);
  const search = page.getByRole('combobox', { name: /^Tìm gian hàng/ });
  await search.fill('OPC Hà Nội');
  await page
    .getByRole('listbox')
    .getByRole('option', { name: /^OPC Hà Nội\s/ })
    .click();
  await expect(page).toHaveURL(/\/chat\/c1$/);
  await search.fill('OPC Đà Nẵng');
  await page
    .getByRole('listbox')
    .getByRole('option', { name: /^OPC Đà Nẵng\s/ })
    .click();
  await expect(page).toHaveURL(/\/community\?join=c3$/);
  await expect(page.getByRole('dialog', { name: 'OPC Đà Nẵng' })).toBeVisible();
  await expect(search).toHaveValue('');
});
