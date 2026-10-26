import { expect, type Page } from '../../server/test';

/**
 * V4-607: TK vừa kích hoạt gặp popup khai báo (không đóng được) trước Bảng giá.
 * D-89 (form đăng ký v4 không còn vai trò / MST / nhóm): ô nào trống thì điền — vai trò
 * "Chuyên gia" (gợi ý OPC sẵn), MST tra cứu được, OPC theo tỉnh. Bấm "Lưu & tiếp tục →".
 */
export async function completeDeclaration(page: Page, province = 'Hà Nội') {
  const dialog = page
    .getByRole('dialog', {
      name: /^(Hoàn tất thông tin tham gia|Khai báo thông tin doanh nghiệp)$/,
    })
    .first();
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  const role = dialog.getByRole('radio', { name: /Chuyên gia/ });
  if ((await role.count()) && (await role.getAttribute('aria-checked')) !== 'true')
    await role.click();
  const tax = dialog.getByPlaceholder('VD: 0101234567');
  if ((await tax.count()) && !(await tax.inputValue())) {
    await tax.fill('0101234567');
    await expect(dialog.getByText('Tự động từ MST', { exact: true })).toBeVisible();
  }
  const biz = dialog.getByPlaceholder('Gõ để tìm hoặc chọn tỉnh/thành');
  if (await biz.count()) {
    await biz.fill(province);
    await dialog.getByRole('option', { name: new RegExp(`^${province}`) }).click();
  }
  if (await dialog.getByText('Đã chọn 0 OPC', { exact: true }).count()) {
    await dialog.getByPlaceholder('Nhập tên tỉnh/thành, VD: Đà Nẵng, Hà Nội...').fill(province);
    await dialog.getByRole('option', { name: new RegExp(`OPC ${province}`) }).click();
  }
  const put = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/me/declaration' && r.request().method() === 'PUT',
  );
  await dialog.getByRole('button', { name: 'Lưu & tiếp tục', exact: true }).click();
  expect((await put).status()).toBe(200);
  await expect(dialog).toHaveCount(0);
  // Toast "Đã lưu thông tin…" (prototype flash) tự tắt — chờ hết để toast sau không bị lẫn
  const saved = page.getByRole('status').filter({ hasText: /^Đã lưu thông tin/ });
  await expect(saved).toBeVisible();
  await expect(saved).toHaveCount(0, { timeout: 10_000 });
}
