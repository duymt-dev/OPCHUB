import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';

/** G3a — P-79 → P-83: popup Gói dịch vụ + form tư vấn (app mới, MSW) */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
/** Prototype v4 `data-pg="1"`: mở từ menu → Bảng giá là trang trong khung nội dung (không phải hộp) */
const popup = (page: Page) => page.getByRole('region', { name: 'Gói dịch vụ' });

async function openServices(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Cộng đồng', { exact: true }).click();
  await expect(page.getByText('Khám phá cộng đồng')).toBeVisible();
  await page.locator('aside').getByText('Bảng giá', { exact: true }).click();
  await expect(popup(page).getByText('Hỗ trợ phát triển doanh nghiệp')).toBeVisible();
}

/** "Đào tạo & Ươm mầm OPC" (V4, D-60) */
const consultAi = (page: Page) =>
  popup(page).getByRole('button', { name: 'Đăng ký Đào tạo & Ươm mầm OPC' });

/** Điền đủ trường DN (QT-11); tên tổ chức + MST điền sẵn từ hồ sơ TK DN demo */
async function fillBiz(page: Page) {
  const p = popup(page);
  await expect(p.getByLabel('Tên tổ chức')).toHaveValue('Công ty TNHH Giải pháp MediaSoft');
  await expect(p.getByLabel('10 hoặc 13 số')).toHaveValue('0101234567');
  await p.getByLabel('Loại hình').selectOption({ label: 'Doanh nghiệp' });
  await p.getByLabel('Quy mô nhân sự').selectOption({ label: '11 – 50 người' });
  await p.getByLabel('Chức vụ').fill('Giám đốc');
  await p.getByLabel('Tỉnh / thành').selectOption({ label: 'Hà Nội' });
  await p.getByRole('textbox', { name: /Mô tả nhu cầu/ }).fill('Cần tư vấn khóa học cho đội ngũ');
}

test.describe('Gói dịch vụ', () => {
  test('REQ-501 UP-12 Bảng giá 3 gói: gói của TK DN đã đóng phí là Gia hạn, gói khác khoá; mở từ menu là trang', async ({
    page,
  }) => {
    await openServices(page);
    await expect(page).toHaveURL(/\/services$/);
    const p = popup(page);
    await expect(p.getByText('BẢNG GIÁ THÀNH VIÊN')).toBeVisible();
    // D-68: Cá nhân 100.000đ/tháng (1.200.000đ/năm) · Doanh nghiệp 300.000đ/tháng (3.600.000đ/năm)
    await expect(p.getByText('Ưu đãi 50%')).toBeVisible();
    await expect(p.getByText('100.000đ', { exact: true })).toBeVisible();
    await expect(p.getByText('Ưu đãi 40%')).toBeVisible();
    await expect(p.getByText('300.000đ', { exact: true })).toBeVisible();
    await expect(p.getByText('15.000.000đ', { exact: true })).toBeVisible();
    // TK demo là Doanh nghiệp đã đóng phí (D-68)
    await expect(p.getByText('Gói của bạn')).toHaveCount(1);
    await expect(p.getByRole('button', { name: 'Gia hạn · 3.600.000đ/năm' })).toBeEnabled();
    await expect(p.getByRole('button', { name: 'Dành cho tài khoản Cá nhân' })).toBeDisabled();
    await expect(p.getByRole('button', { name: 'Đăng ký · 15.000.000đ/dự án' })).toBeEnabled();
    // dạng trang: không nền tối, không ×, màn trước bị thay; trang tự cuộn (không khoá cuộn)
    await expect(page.getByRole('dialog', { name: 'Gói dịch vụ' })).toHaveCount(0);
    await expect(p.getByRole('button', { name: 'Đóng' })).toHaveCount(0);
    await expect(page.getByText('Khám phá cộng đồng')).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
      'hidden',
    );
    await page.locator('aside').getByText('Cộng đồng', { exact: true }).click();
    await expect(popup(page)).toBeHidden();
    await expect(page).toHaveURL(/\/community$/);
    await expect(page.getByText('Khám phá cộng đồng')).toBeVisible();
  });

  test('UAT-21 BUG-022 tư vấn DN thiếu trường → đánh dấu tại ô', async ({ page }) => {
    await openServices(page);
    await consultAi(page).click();
    const p = popup(page);
    await p.getByLabel('Tên tổ chức').fill('');
    await p.getByRole('button', { name: 'Gửi yêu cầu' }).click();
    await expect(toast(page)).toHaveText('Vui lòng nhập tên doanh nghiệp / tổ chức');
    for (const label of ['Tên tổ chức', 'Loại hình', 'Quy mô nhân sự', 'Chức vụ', 'Tỉnh / thành']) {
      await expect(p.getByLabel(label)).toHaveAttribute('aria-invalid', 'true');
    }
    await expect(p.getByRole('textbox', { name: /Mô tả nhu cầu/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(p.getByLabel('10 hoặc 13 số')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(p.getByText('Vui lòng chọn loại hình tổ chức')).toBeVisible();
    await expect(p.getByLabel('Tên tổ chức')).toBeFocused();
  });

  test('form tư vấn: TK DN mở biến thể DN; báo thiếu lần lượt; gửi → phiếu', async ({ page }) => {
    await openServices(page);
    await consultAi(page).click();
    await expect(page).toHaveURL(/\/services\/train\/request$/);
    await expect(popup(page).getByText('THÔNG TIN TỔ CHỨC')).toBeVisible();
    await expect(popup(page).getByLabel('Tên tổ chức')).toHaveValue(
      'Công ty TNHH Giải pháp MediaSoft',
    );

    const send = popup(page).getByRole('button', { name: 'Gửi yêu cầu' });
    await send.click();
    await expect(toast(page)).toHaveText('Vui lòng chọn loại hình tổ chức');
    await popup(page).getByLabel('Loại hình').selectOption({ label: 'Doanh nghiệp' });
    // QT-11: DN bắt buộc quy mô + chức vụ (MST điền sẵn từ hồ sơ)
    await send.click();
    await expect(toast(page)).toHaveText('Vui lòng chọn quy mô nhân sự');
    await popup(page).getByLabel('Quy mô nhân sự').selectOption({ label: '1 – 10 người' });
    await send.click();
    await expect(toast(page)).toHaveText('Vui lòng nhập chức vụ người liên hệ');
    await popup(page).getByLabel('Chức vụ').fill('Giám đốc');
    await send.click();
    await expect(toast(page)).toHaveText('Vui lòng chọn tỉnh / thành phố');
    await popup(page).getByLabel('Tỉnh / thành').selectOption({ label: 'Hà Nội' });
    await send.click();
    await expect(toast(page)).toHaveText('Vui lòng mô tả nhu cầu');

    // Biến thể Cá nhân bắt chọn nghề nghiệp
    await popup(page).getByRole('radio', { name: 'Cá nhân' }).click();
    await expect(popup(page).getByText('THÔNG TIN CÁ NHÂN')).toBeVisible();
    await popup(page)
      .getByRole('textbox', { name: /Mô tả nhu cầu/ })
      .fill('Cần tư vấn khóa học');
    await send.click();
    await expect(toast(page)).toHaveText('Vui lòng chọn nghề nghiệp / vai trò');
    await popup(page).getByRole('radio', { name: 'Doanh nghiệp / Tổ chức' }).click();

    await send.click();
    await expect(popup(page).getByText('Đã gửi yêu cầu tư vấn')).toBeVisible();
    await expect(popup(page).getByText(/^YC-\d+$/)).toBeVisible();
    // D-72: phiếu không trạng thái — màn đã gửi hiện cố định "Đã gửi" như prototype v4
    await expect(popup(page).getByText('Đã gửi', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/services\/requests\/YC-\d+$/);
    await popup(page).getByRole('button', { name: 'Về Gói dịch vụ' }).click();
    await expect(page).toHaveURL(/\/services$/);
  });

  test('UAT-21 QT-11 form DN thiếu MST bị chặn, không gọi API', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/v1\/service-requests$/.test(r.url())) posts.push(r.url());
    });
    await openServices(page);
    await consultAi(page).click();
    await fillBiz(page);
    await popup(page).getByLabel('10 hoặc 13 số').fill('');
    const send = popup(page).getByRole('button', { name: 'Gửi yêu cầu' });
    await send.click();
    await expect(toast(page)).toHaveText('Vui lòng nhập mã số thuế (10 hoặc 13 số)');
    await popup(page).getByLabel('10 hoặc 13 số').fill('010123456');
    await send.click();
    await expect(toast(page)).toHaveText('Vui lòng nhập mã số thuế (10 hoặc 13 số)');
    await expect(popup(page).getByText('Đã gửi yêu cầu tư vấn')).toHaveCount(0);
    expect(posts).toEqual([]);
  });

  test('REQ-408 LK-08 Đăng ký tư vấn → tạo phiếu DN đủ trường', async ({ page }) => {
    await openServices(page);
    await consultAi(page).click();
    await fillBiz(page);
    const created = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/v1\/service-requests$/.test(r.url()),
    );
    await popup(page).getByRole('button', { name: 'Gửi yêu cầu' }).click();
    const res = await created;
    expect(res.status()).toBe(201);
    const yc = (await res.json()) as {
      code: string;
      requesterType: string;
      taxCode: string;
      details: Record<string, string>;
    };
    expect(yc).not.toHaveProperty('status');
    expect(yc).toMatchObject({
      requesterType: 'business',
      taxCode: '0101234567',
      details: {
        'Loại hình': 'Doanh nghiệp',
        'Quy mô nhân sự': '11 – 50 người',
        'Chức vụ người liên hệ': 'Giám đốc',
      },
    });
    expect(yc.code).toMatch(/^YC-\d+$/);
    await expect(popup(page).getByText('Đã gửi yêu cầu tư vấn')).toBeVisible();
    await expect(popup(page).getByText(yc.code, { exact: true })).toBeVisible();
    // D-72: phiếu không trạng thái — màn đã gửi hiện cố định "Đã gửi" như prototype v4
    await expect(popup(page).getByText('Đã gửi', { exact: true })).toBeVisible();
  });

  test('Hủy / "‹ Gói dịch vụ" quay về danh sách', async ({ page }) => {
    await openServices(page);
    await consultAi(page).click();
    await popup(page).getByRole('button', { name: 'Hủy' }).click();
    await expect(popup(page).getByText('Hỗ trợ phát triển doanh nghiệp')).toBeVisible();
    await consultAi(page).click();
    await popup(page).getByRole('button', { name: 'Gói dịch vụ' }).click();
    await expect(page).toHaveURL(/\/services$/);
  });
});
