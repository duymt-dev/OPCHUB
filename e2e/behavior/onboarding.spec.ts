import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { onServer } from '../server/api';

/**
 * V4-611 UP-04 · AD-02 (REQ-505, D-85, D-88): Dashboard "Hướng dẫn bắt đầu" tính từ dữ liệu thật →
 * chia sẻ link Affiliate xong bước 7 → Admin › Thành viên cột Khởi đầu + lọc + Nhắc (1 lần / 24 giờ).
 * MSW: M1 = 6/8 (thiếu hồ sơ — chưa có ảnh — và Affiliate) như prototype `_ob`.
 */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function login(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

const card = (page: Page) => page.locator('[data-onb="card"]');
const step = (page: Page, key: string) => card(page).locator(`[data-step="${key}"]`);

test.describe('Hướng dẫn bắt đầu', () => {
  test('UP-04: thẻ 8 bước trên Dashboard; "Lấy link" → sao chép → bước Affiliate xong', async ({
    page,
  }) => {
    test.skip(
      onServer,
      'Server: tiến độ M1 phụ thuộc seed demo — kiểm ở int (onboarding.int.spec)',
    );
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await login(page, PORTAL_URL, 'an.nguyen@mediasoft.vn', 'User@2026');
    await expect(page.locator('[data-onb="greet"]')).toContainText(
      'Hoàn thành các bước dưới đây để bắt đầu tham gia cộng đồng OPC Hub một cách đầy đủ.',
    );
    await expect(card(page)).toContainText('Hướng dẫn bắt đầu');
    await expect(card(page).locator('[data-onb="progress"]')).toHaveText(/Đã xong 6\/8 bước · 75%/);
    await expect(step(page, 'pay')).toHaveAttribute('data-state', 'done');
    await expect(step(page, 'prof')).toHaveAttribute('data-state', 'next');
    await expect(step(page, 'st')).toContainText('Đã hoàn thành');
    await expect(card(page).locator('[data-step]')).toHaveCount(8);

    await step(page, 'aff').getByRole('button', { name: 'Lấy link' }).click();
    await expect(page).toHaveURL(/\/affiliate$/);
    await page.getByRole('button', { name: 'Sao chép', exact: true }).first().click();

    await page.locator('aside nav').getByRole('link', { name: 'Dashboard' }).click();
    await expect(card(page).locator('[data-onb="progress"]')).toHaveText(/Đã xong 7\/8 bước · 88%/);
    await expect(step(page, 'aff')).toHaveAttribute('data-state', 'done');
  });

  test('AD-02: cột Khởi đầu x/8, lọc Đã / Chưa hoàn tất, Nhắc → "Đã nhắc"; lần 2 trong 24 giờ bị chặn', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.locator('aside').getByText('Thành viên', { exact: true }).click();
    const filter = page.getByLabel('Khởi đầu');
    await filter.selectOption('todo');
    await expect(page).toHaveURL(/onb=todo/);
    const cell = page.locator('[data-onb]').first();
    await expect(cell).toHaveText(/\d\/8/);
    await expect(cell).toHaveAttribute('title', /^Còn thiếu: /);

    const remind = cell.getByRole('button', { name: /^Nhắc .* hoàn tất hướng dẫn bắt đầu$/ });
    await remind.click();
    await expect(toast(page)).toHaveText(/^Đã gửi nhắc tới .+ \(thông báo \+ email\)$/);
    await expect(cell).toContainText('Đã nhắc');
    await remind.click();
    await expect(toast(page).last()).toHaveText('Đã nhắc thành viên này trong 24 giờ qua');

    await filter.selectOption('done');
    await expect(page).toHaveURL(/onb=done/);
    await filter.selectOption('all');
    await expect(page).not.toHaveURL(/onb=/);
  });
});
