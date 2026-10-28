import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';
import { login, toast } from './project-helpers';

test('REQ-612 QT-ST-PJ dự án gian hàng → form prefill → đăng ngay → mở dự án', async ({ page }) => {
  await login(page);
  await page.goto(`${PORTAL_URL}/stores/st1`);
  const block = page.locator('[data-block="store-projects"]');
  await expect(block.getByRole('link', { name: /OPC Hub Mobile/ })).toBeVisible();
  await block.getByRole('button', { name: '+ Đăng dự án OPC', exact: true }).click();
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
