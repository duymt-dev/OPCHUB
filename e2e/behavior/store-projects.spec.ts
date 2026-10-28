import { expect, test } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { login, toast } from './project-helpers';

test('REQ-612 QT-ST-PJ dự án gian hàng → form prefill → đăng ngay → mở dự án', async ({ page }) => {
  await login(page);
  await page.goto(`${PORTAL_URL}/stores/st1`);
  const block = page.locator('[data-block="store-projects"]');
  await expect(block.getByRole('link', { name: /OPC Hub Mobile/ })).toBeVisible();
  await block.getByRole('button', { name: '+ Đăng dự án OPC', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  const form = page.getByRole('dialog', { name: 'Đăng dự án mới' });
  await expect(form.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC')).toHaveValue(
    'Công ty TNHH Giải pháp MediaSoft',
  );
  await expect(form.getByLabel('Địa phương', { exact: true })).toHaveValue('Hà Nội');
  await expect(form.getByLabel('Địa phương', { exact: true })).toHaveAttribute('readonly', '');
  await expect(form.getByRole('combobox', { name: /Đối tượng tham gia/ })).toHaveValue('business');
  await form.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC').fill('Dự án gian hàng MediaSoft');
  await form
    .getByRole('combobox', { name: /Nhóm ngành giải pháp/ })
    .selectOption({ label: 'Chuyển đổi số & AI' });
  await form
    .getByPlaceholder('Một câu giới thiệu dự án của bạn')
    .fill('Giải pháp hỗ trợ doanh nghiệp địa phương');
  await form.getByPlaceholder('https://demo.duan-cua-ban.app').fill('https://demo.example.test');
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'POST' && /\/v1\/projects$/.test(r.url()),
  );
  await form.getByRole('button', { name: 'Gửi đăng dự án' }).click();
  const response = await saved;
  expect(response.status()).toBe(201);
  expect(await response.json()).toMatchObject({
    status: 'published',
    storeId: 'st1',
    province: 'Hà Nội',
  });
  await expect(toast(page)).toHaveText('Đã đăng dự án – dự án hiển thị ngay trong cộng đồng');
  await expect(page).toHaveURL(/\/projects\/mine$/);
  // Client navigation preserves the MSW process exactly as the real app keeps the saved server row.
  await page.locator('aside nav').getByRole('link', { name: 'Gian hàng địa phương' }).click();
  await page
    .getByRole('link', { name: /Công ty TNHH Giải pháp MediaSoft/ })
    .first()
    .click();
  await expect(block.getByRole('link', { name: /Dự án gian hàng MediaSoft/ })).toBeVisible();
  await block.getByRole('link', { name: /Dự án gian hàng MediaSoft/ }).click();
  await expect(page.getByText('Dự án gian hàng MediaSoft', { exact: true }).last()).toBeVisible();
});

for (const owner of [true, false]) {
  test(`QT-ST-PJ ${owner ? 'owner' : 'visitor'}: hide removes store project, empty state, republish restores`, async ({
    page,
    context,
  }) => {
    if (owner) await login(page);
    else {
      await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Google/ }).click();
      await page.getByRole('button', { name: /^Cá nhân/ }).click();
      await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
      await page.getByRole('button', { name: 'Hoàn tất và vào cộng đồng' }).click();
      await expect(page).toHaveURL(/\/community$/);
      await page
        .getByRole('dialog', { name: 'Đã gửi email chào mừng' })
        .getByRole('button', { name: 'Đóng' })
        .click();
    }
    await page.goto(`${PORTAL_URL}/stores/st1`);
    const block = page.locator('[data-block="store-projects"]');
    await expect(block.getByRole('link', { name: /OPC Hub Mobile/ })).toBeVisible();
    await expect(block.getByRole('button', { name: '+ Đăng dự án OPC', exact: true })).toHaveCount(
      owner ? 1 : 0,
    );
    const admin = await context.newPage();
    await admin.goto(`${ADMIN_URL}/login`);
    await admin.locator('input[autocomplete=username]').fill('admin@opchub.community');
    await admin.locator('input[type=password]').fill('Admin@2026');
    await admin.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await admin.waitForURL(/\/overview$/);
    await admin.goto(`${ADMIN_URL}/projects/p10/review`);
    const drawer = admin.getByRole('dialog', { name: 'Xem & duyệt dự án' });
    await drawer.getByRole('button', { name: 'Ẩn dự án', exact: true }).click();
    await admin.getByRole('alertdialog').getByRole('button', { name: 'Ẩn', exact: true }).click();
    await expect(toast(admin)).toHaveText('Đã ẩn · OPC Hub Mobile');
    await page.reload();
    await expect(block).toContainText(
      'Chưa có dự án. Dự án OPC do doanh nghiệp đăng sẽ tự hiện tại đây và ở trang Dự án OPC.',
    );
    await expect(block.getByRole('link')).toHaveCount(0);
    await expect(block.locator('img')).toHaveCount(0);
    await admin.goto(`${ADMIN_URL}/projects/p10/review`);
    await drawer.getByRole('button', { name: 'Xuất bản lại' }).click();
    await expect(toast(admin)).toHaveText('Đã duyệt & xuất bản · OPC Hub Mobile');
    await page.reload();
    await expect(block.getByRole('link', { name: /OPC Hub Mobile/ })).toBeVisible();
  });
}
