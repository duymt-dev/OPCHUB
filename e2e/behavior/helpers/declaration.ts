import { expect, type Page } from '../../server/test';

/**
 * V4-607: TK vừa kích hoạt gặp popup khai báo (không đóng được) trước mail chào mừng / Bảng giá.
 * Dữ liệu đăng ký được điền sẵn; DN cần thêm tỉnh/thành ĐKKD. Bấm "Lưu & tiếp tục →".
 */
export async function completeDeclaration(page: Page, province = 'Hà Nội') {
  const dialog = page
    .getByRole('dialog', {
      name: /^(Hoàn tất thông tin tham gia|Khai báo thông tin doanh nghiệp)$/,
    })
    .first();
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  const biz = dialog.getByPlaceholder('Gõ để tìm hoặc chọn tỉnh/thành');
  if (await biz.count()) {
    await biz.fill(province);
    await dialog.getByRole('option', { name: new RegExp(`^${province}`) }).click();
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
