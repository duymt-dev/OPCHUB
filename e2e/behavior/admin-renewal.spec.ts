import { test, expect, type Page } from '../server/test';
import { ADMIN_URL } from '../urls';
const annotation = { type: 'demo', description: 'renewal' };
async function open(page: Page, email = 'admin@opchub.community') {
  await page.goto(`${ADMIN_URL}/login`);
  await page.locator('input[autocomplete=username], input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto(`${ADMIN_URL}/settings?tab=renewal`);
}
test(
  'REQ-620 save config persists on reload; five switches, no Zalo; responsive table scroll',
  { annotation },
  async ({ page }) => {
    await open(page);
    const region = page.getByRole('region', { name: 'Nhắc gia hạn tự động', exact: true });
    await expect(region.getByRole('switch')).toHaveCount(5);
    await expect(region.getByText(/Zalo/)).toHaveCount(0);
    await region.getByRole('switch', { name: '30 ngày trước hạn', exact: true }).click();
    const saved = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/v1/admin/settings/renewal' &&
        r.request().method() === 'PATCH',
    );
    await region.getByRole('button', { name: 'Lưu cấu hình' }).click();
    expect((await saved).status()).toBe(200);
    await expect(page.getByRole('status')).toContainText('Đã lưu cấu hình nhắc gia hạn');
    await page.reload();
    await expect(
      region.getByRole('switch', { name: '30 ngày trước hạn', exact: true }),
    ).toHaveAttribute('aria-checked', 'false');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(region.getByRole('region', { name: 'Thành viên sắp hết hạn' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  },
);
test(
  'REQ-620 TC-471 no channel blocks send without API request',
  { annotation },
  async ({ page }) => {
    await open(page);
    const region = page.getByRole('region', { name: 'Nhắc gia hạn tự động', exact: true });
    await region.getByRole('switch', { name: 'Email (Brevo)', exact: true }).click();
    await region.getByRole('switch', { name: 'Thông báo trong hệ thống', exact: true }).click();
    const sent: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).pathname === '/v1/admin/renewal/send') sent.push(r.url());
    });
    await region.getByRole('button', { name: 'Gửi nhắc tất cả' }).click();
    await expect(page.getByRole('status')).toContainText('Bật ít nhất 1 kênh gửi');
    expect(sent).toHaveLength(0);
  },
);
test(
  'REQ-620 TC-472 send one updates last sent and mail history; send all succeeds',
  { annotation },
  async ({ page }) => {
    await open(page);
    const region = page.getByRole('region', { name: 'Nhắc gia hạn tự động', exact: true });
    const row = region.getByRole('row').filter({ hasText: 'an.nguyen@mediasoft.vn' });
    await expect(row).toContainText('Còn 12 ngày');
    await expect(row).toContainText('Chưa gửi');
    const sent = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/v1/admin/renewal/send' && r.request().method() === 'POST',
    );
    await row.getByRole('button', { name: 'Gửi nhắc', exact: true }).click();
    expect((await sent).status()).toBe(200);
    await expect(row).toContainText('Đã gửi vài giây trước');
    const all = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/v1/admin/renewal/send' && r.request().method() === 'POST',
    );
    await region.getByRole('button', { name: 'Gửi nhắc tất cả' }).click();
    expect((await all).status()).toBe(200);
    await expect(page.getByRole('status')).toContainText('Đã gửi nhắc gia hạn tới');
    await expect(page.getByRole('status')).toContainText('qua Email, thông báo');
    await page.goto(`${ADMIN_URL}/marketing?tab=log`);
    await expect(page.getByText('Nhắc gia hạn', { exact: true }).first()).toBeVisible();
    await expect(
      page
        .getByRole('listitem')
        .filter({ hasText: 'an.nguyen@mediasoft.vn' })
        .filter({ hasText: 'Nhắc gia hạn' })
        .first(),
    ).toBeVisible();
  },
);
test('REQ-620 no settings.mail permission hides renewal tab', { annotation }, async ({ page }) => {
  await open(page, 'yen.do@opchub.community');
  await expect(
    page
      .getByRole('navigation', { name: 'Mục cài đặt' })
      .getByRole('button', { name: /Nhắc gia hạn/ }),
  ).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Nhắc gia hạn tự động' })).toHaveCount(0);
});
