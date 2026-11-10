import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { env } from '../env';

async function openProfile(page: Page) {
  await page.goto(`${ADMIN_URL}/login`);
  await page.locator('input[autocomplete=username]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL('**/overview');
  await page.locator('[data-m=me]').click();
  await page.getByRole('menuitem', { name: 'Hồ sơ cá nhân' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toBeVisible();
}

test('TIP-V46-822 AC-01/02/03 Admin profile menu, own info, avatar upload/removal and topbar sync', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProfile(page);
  await expect(page.getByLabel('Email đăng nhập')).toBeDisabled();
  await expect(page.getByLabel('Email đăng nhập')).toHaveValue('admin@opchub.community');
  await expect(page.getByText('Super Admin', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Đăng nhập Admin Dashboard', { exact: true })).toBeHidden();
  const dir = resolve('../coding-packs/reports/evidence/v46-822');
  mkdirSync(dir, { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({
      path: resolve(dir, `${env.E2E_TARGET}-profile-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('Họ và tên').fill('Trần Quản Trị');
  await page.getByLabel('Số điện thoại').fill('0901234567');
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(page.getByText('Đã lưu thông tin cá nhân', { exact: true })).toBeVisible();
  await expect(page.locator('[data-m=me]')).toContainText('Trần Quản Trị');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('button', { name: 'Tải ảnh mới' })).not.toHaveClass(
    /ant-btn-loading/,
  );
  await expect(page.locator('input#avatarUrl')).toHaveValue(/\/uploads\//);
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  const avatarUrl = await page.locator('input#avatarUrl').inputValue();
  await expect(page.locator('[data-m=me] img')).toHaveAttribute('src', avatarUrl);
  await page.getByRole('button', { name: 'Xóa ảnh' }).click();
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(page.locator('[data-m=me] img')).toHaveCount(0);
  await expect(page.locator('[data-m=me]')).toContainText('TT');
});

test('TIP-V46-822 AC-04/05 password field errors then successful change preserves current session', async ({
  page,
}) => {
  await openProfile(page);
  const current = page.getByLabel('Mật khẩu hiện tại', { exact: true });
  const next = page.getByLabel('Mật khẩu mới', { exact: true });
  const confirm = page.getByLabel('Xác nhận mật khẩu mới', { exact: true });
  const submit = page.getByRole('button', { name: 'Cập nhật mật khẩu' });
  await current.fill('WrongPass1');
  await next.fill('NewAdminPass1');
  await confirm.fill('NewAdminPass1');
  await submit.click();
  await expect(page.getByText('Mật khẩu hiện tại không đúng', { exact: true })).toBeVisible();
  await current.fill('Admin@2026');
  await next.fill('weak');
  await confirm.fill('weak');
  await submit.click();
  await expect(
    page.getByText('Mật khẩu mới tối thiểu 8 ký tự, có chữ hoa và chữ số', { exact: true }),
  ).toBeVisible();
  await next.fill('Admin@2026');
  await confirm.fill('Admin@2026');
  await submit.click();
  await expect(
    page.getByText('Mật khẩu mới phải khác mật khẩu hiện tại', { exact: true }),
  ).toBeVisible();
  await next.fill('NewAdminPass1');
  await confirm.fill('OtherAdminPass2');
  await submit.click();
  await expect(page.getByText('Mật khẩu nhập lại không khớp', { exact: true })).toBeVisible();
  await confirm.fill('NewAdminPass1');
  await submit.click();
  await expect(page.getByText('Đã cập nhật mật khẩu', { exact: true })).toBeVisible();
  await expect(current).toHaveValue('');
  await expect(next).toHaveValue('');
  await expect(confirm).toHaveValue('');
  await page.getByRole('link', { name: 'Tổng quan', exact: true }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await page.locator('[data-m=me]').click();
  await page.getByRole('menuitem', { name: 'Hồ sơ cá nhân' }).click();
  await expect(page.getByLabel('Email đăng nhập')).toHaveValue('admin@opchub.community');
});
