import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';
import { onServer, payFee } from '../server/api';
import { noisePng } from './png-fixture';
import { openProjects, toast } from './project-helpers';

test.describe('Dự án của tôi', () => {
  test('P-61: thành viên mới (SSO) chưa có dự án → trạng thái trống, mở form', async ({ page }) => {
    // prototype chỉ có TK demo đã sở hữu dự án; thành viên mới qua SSO (D-45) chưa có dự án nào
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
    // D-28: TK mới chưa đóng phí nên popup Gói dịch vụ (G3a) phủ lên trang; màn bên dưới vẫn dựng
    // → bấm qua dispatchEvent (như membership.spec) để kiểm trạng thái trống của Dự án của tôi
    // Q-B62-20: API thật chặn /me/projects khi chưa đóng phí → TK SSO mới đóng phí trước
    if (onServer) await payFee(page);
    await page.locator('aside').getByText('Dự án OPC', { exact: true }).dispatchEvent('click');
    await page.getByRole('tab', { name: /Dự án của tôi/ }).dispatchEvent('click');
    await expect(page).toHaveURL(/\/projects\/mine/);
    await expect(page.getByRole('tab', { name: 'Dự án của tôi 0' })).toBeAttached();
    await expect(page.getByText('Bạn chưa có dự án nào')).toBeAttached();
    await page.getByRole('button', { name: '+ Đăng dự án đầu tiên' }).dispatchEvent('click');
    await expect(page.getByRole('dialog', { name: 'Đăng dự án mới' })).toBeAttached();
  });

  test('REQ-612 D-108 sửa dự án đang hiển thị → công khai ngay không chờ duyệt', async ({
    page,
  }) => {
    await openProjects(page);
    await page.getByRole('tab', { name: /Dự án của tôi/ }).click();
    await expect(page).toHaveURL(/\/projects\/mine/);
    const row = page.locator('[role=link]').filter({ hasText: 'OPC Hub Mobile' });
    await row.getByRole('button', { name: 'Chỉnh sửa' }).click();
    const edit = page.getByRole('dialog', { name: 'Chỉnh sửa dự án' });
    await edit.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC').fill('OPC Hub Mobile 2');
    await edit.getByRole('button', { name: 'Gửi đăng dự án' }).click();
    await expect(toast(page)).toHaveText('Đã đăng dự án – dự án hiển thị ngay trong cộng đồng');
    // V4-610 (prototype `fundSt`): dự án có gọi vốn chưa mua gói có phí → popup thanh toán
    const fund = page.getByRole('dialog', { name: /^Thanh toán Gói Gọi vốn/ });
    await fund.getByRole('button', { name: 'Quay lại' }).click();
    await expect(fund).toBeHidden();
    await expect(row).toContainText('Đang hiển thị');
    await expect(row).not.toContainText('Bản sửa chờ duyệt');
    await expect(row).toContainText('OPC Hub Mobile');
    await expect(row).toContainText('OPC Hub Mobile 2');
    // Trang công khai phản ánh nội dung mới ngay
    await row.click();
    await expect(page).toHaveURL(/\/projects\/p10/);
    await expect(page.getByText('Giới thiệu dự án')).toBeVisible();
    await expect(page.getByText('OPC Hub Mobile 2', { exact: true }).last()).toBeVisible();
    // Sửa tiếp: form mở nội dung đã công khai
    await page.goBack();
    await expect(page).toHaveURL(/\/projects\/mine/);
    await row.getByRole('button', { name: 'Chỉnh sửa' }).click();
    await expect(edit.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC')).toHaveValue(
      'OPC Hub Mobile 2',
    );
  });

  test('REQ-612 form: báo thiếu trường, lưu nháp rồi đăng ngay', async ({ page }) => {
    await openProjects(page);
    await page.getByRole('button', { name: /Đăng dự án của bạn/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Đăng dự án mới' });
    await sheet.getByRole('button', { name: 'Gửi đăng dự án' }).click();
    await expect(toast(page)).toHaveText('Vui lòng nhập tên dự án');

    await sheet.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC').fill('Dự án thử');
    await sheet.getByRole('button', { name: 'Lưu nháp' }).click();
    await expect(toast(page)).toHaveText('Đã lưu bản nháp');
    await expect(page).toHaveURL(/\/projects\/mine/);
    await expect(page.getByText('Bản nháp', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Chỉnh sửa' }).first().click();
    const edit = page.getByRole('dialog', { name: 'Chỉnh sửa dự án' });
    await edit
      .getByRole('combobox', { name: /Nhóm ngành giải pháp/ })
      .selectOption({ label: 'Thủy sản' });
    await edit.getByPlaceholder('Một câu giới thiệu dự án của bạn').fill('Thử luồng gửi duyệt');
    await edit.getByRole('button', { name: 'Gửi đăng dự án' }).click();
    await expect(toast(page)).toHaveText(
      'Vui lòng nhập link bản test hợp lệ (bắt đầu bằng https://)',
    );
    await edit.getByPlaceholder('https://demo.duan-cua-ban.app').fill('https://demo.thu.app');
    await edit.getByRole('button', { name: 'Gửi đăng dự án' }).click();
    await expect(toast(page)).toHaveText('Đã đăng dự án – dự án hiển thị ngay trong cộng đồng');
    await expect(page.locator('[role=link]').filter({ hasText: 'Dự án thử' })).toContainText(
      'Đang hiển thị',
    );
  });

  test('BUG-002 REQ-226 dự án có ảnh bìa', async ({ page }) => {
    await openProjects(page);
    await page.getByRole('button', { name: /Đăng dự án của bạn/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Đăng dự án mới' });
    const cover = sheet.locator('input[type=file]').first();
    // NA-26: > 5 MB bị từ chối tại ô, giữ trống
    await cover.setInputFiles({
      name: 'to.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(6 * 1024 * 1024),
    });
    await expect(toast(page)).toHaveText('Ảnh phải là PNG, JPG hoặc WebP, tối đa 5MB');
    await expect(sheet.getByRole('button', { name: 'Gỡ ảnh' })).toHaveCount(0);

    await cover.setInputFiles(noisePng(300 * 1024));
    await expect(sheet.getByRole('button', { name: 'Gỡ ảnh' })).toBeVisible();
    await sheet.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC').fill('Dự án có ảnh bìa');
    const saved = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/v1\/projects$/.test(r.url()),
    );
    await sheet.getByRole('button', { name: 'Lưu nháp' }).click();
    const res = await saved;
    expect(res.status()).toBe(201);
    const body = res.request().postDataJSON() as { coverUrl: string | null };
    expect(body.coverUrl).toMatch(/\/v1\/uploads\//);
    await expect(toast(page)).toHaveText('Đã lưu bản nháp');
    await expect(page).toHaveURL(/\/projects\/mine/);
    const img = page.locator(`img[src="${body.coverUrl ?? ''}"]`).first();
    await expect(img).toBeVisible();
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  });

  test('chủ dự án thấy nhà đầu tư quan tâm; chia sẻ cần chọn nhóm', async ({ page }) => {
    await openProjects(page);
    await page.getByRole('tab', { name: /Dự án của tôi/ }).click();
    await page.getByRole('button', { name: 'Chia sẻ' }).first().click();
    const share = page.getByRole('dialog', { name: 'Chia sẻ “OPC Hub Mobile”' });
    await share.getByRole('button', { name: 'Chia sẻ', exact: true }).click();
    await expect(toast(page)).toHaveText('Chọn ít nhất 1 nhóm để chia sẻ');
    await share.getByText('OPC Hà Nội').click();
    await share.getByRole('button', { name: 'Chia sẻ', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã chia sẻ OPC Hub Mobile tới 1 nhóm');

    await page.getByText('OPC Hub Mobile', { exact: true }).last().click();
    await page.getByRole('tab', { name: 'Gọi vốn đầu tư' }).click();
    await expect(page.getByText('Nhà đầu tư quan tâm (2)')).toBeVisible();
  });
});
