import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { onServer } from '../server/api';
import { completeDeclaration } from './helpers/declaration';

/**
 * V4-611 UP-04 · AD-02 (REQ-505, D-85, D-88): Dashboard "Hướng dẫn bắt đầu" tính từ dữ liệu thật →
 * chia sẻ link Affiliate xong bước 7. v4.2 (D-100 / D-115): Admin › Thành viên bỏ cột / lọc / Nhắc "Khởi đầu";
 * Portal tự nhắc một lần / ngày khi mở.
 * MSW: M1 = 6/8 (thiếu hồ sơ — chưa có ảnh — và Affiliate) như prototype `_ob`.
 */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function login(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[autocomplete=username], input[type=email]').fill(email);
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

  test('D-100 / D-115: mở Portal lần đầu trong ngày → một thông báo tự nhắc; Admin không còn cột / lọc / Nhắc', async ({
    page,
  }) => {
    // TK mới (miễn phí 3 tháng, còn thiếu bước) — mở Portal sau đăng ký → tự nhắc một lần
    const email = `auto-remind-${Date.now()}@test.vn`;
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByText('Đăng ký', { exact: true }).first().click();
    await page.getByText('Cá nhân', { exact: true }).click();
    await page.getByPlaceholder('ban@congty.vn', { exact: true }).fill(email);
    await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
    const reminded = page.waitForResponse((r) => r.url().endsWith('/me/onboarding/auto-remind'));
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await page.locator('input[inputmode=numeric]').first().fill('123456');
    await page.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
    expect(await (await reminded).json()).toEqual({ reminded: true });
    await page
      .getByRole('dialog', { name: 'Đã gửi email chào mừng' })
      .getByRole('button', { name: 'Đóng' })
      .click();
    await completeDeclaration(page);
    await page.getByRole('button', { name: 'Thông báo' }).click();
    const note = page.getByText(/^Bạn còn \d bước khởi đầu chưa hoàn tất$/);
    await expect(note).toHaveCount(1);
    // Mở lại trong cùng ngày VN → server không nhắc lần hai (gọi thẳng API như Portal khi mở)
    const again = await page.evaluate(async () => {
      const auth = await fetch('/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      const token = auth.ok ? ((await auth.json()) as { accessToken: string }).accessToken : '';
      const r = await fetch('/v1/me/onboarding/auto-remind', {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      return (await r.json()) as { reminded: boolean };
    });
    expect(again).toEqual({ reminded: false });

    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.locator('aside').getByText('Thành viên', { exact: true }).click();
    await expect(page.getByText(/^· \d+ tài khoản$/)).toBeVisible();
    await expect(page.getByLabel('Khởi đầu')).toHaveCount(0);
    await expect(page.locator('[data-onb]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /hoàn tất hướng dẫn bắt đầu$/ })).toHaveCount(0);
  });
});
