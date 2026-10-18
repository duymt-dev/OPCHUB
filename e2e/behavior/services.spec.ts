import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';

/** G3a — P-79 → P-83: popup Gói dịch vụ + form tư vấn (app mới, MSW) */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const popup = (page: Page) => page.getByRole('dialog', { name: 'Gói dịch vụ' });

async function openServices(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Cộng đồng', { exact: true }).click();
  await expect(page.getByText('Khám phá cộng đồng')).toBeVisible();
  await page.locator('aside').getByText('Gói dịch vụ', { exact: true }).click();
  await expect(popup(page).getByText('Chương trình & dịch vụ khác')).toBeVisible();
}

/** "Khóa học Vận hành OPC bằng AI – 30 ngày" là dịch vụ thứ 3 */
const consultAi = (page: Page) => popup(page).getByRole('button', { name: 'Tư vấn' }).nth(2);

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
  test('mở đè lên màn đang xem, × về lại trang trước; TV đã đóng phí thấy hạn', async ({
    page,
  }) => {
    await openServices(page);
    await expect(page).toHaveURL(/\/services$/);
    await expect(popup(page).getByText(/Thành viên đến/)).toBeVisible();
    await expect(
      popup(page).getByText('Văn An, trở thành thành viên OPC Hub Community'),
    ).toBeVisible();
    // D-41: không có giá gạch / "Ưu đãi 75%"
    await expect(popup(page).getByText('Ưu đãi 75%')).toHaveCount(0);
    await popup(page).getByRole('button', { name: 'Đóng' }).click();
    await expect(popup(page)).toBeHidden();
    await expect(page).toHaveURL(/\/community$/);
    await expect(page.getByText('Khám phá cộng đồng')).toBeVisible();
  });

  test('form tư vấn: TK DN mở biến thể DN; báo thiếu lần lượt; gửi → phiếu', async ({ page }) => {
    await openServices(page);
    await consultAi(page).click();
    await expect(page).toHaveURL(/\/services\/ai30\/request$/);
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
    await expect(popup(page).getByText('Mới đăng ký')).toBeVisible();
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

  test('REQ-408 LK-08 Tư vấn → tạo phiếu DN đủ trường', async ({ page }) => {
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
      status: string;
      requesterType: string;
      taxCode: string;
      details: Record<string, string>;
    };
    expect(yc).toMatchObject({
      status: 'new',
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
    await expect(popup(page).getByText('Mới đăng ký')).toBeVisible();
  });

  test('Hủy / "‹ Gói dịch vụ" quay về danh sách', async ({ page }) => {
    await openServices(page);
    await consultAi(page).click();
    await popup(page).getByRole('button', { name: 'Hủy' }).click();
    await expect(popup(page).getByText('Chương trình & dịch vụ khác')).toBeVisible();
    await consultAi(page).click();
    await popup(page).getByRole('button', { name: 'Gói dịch vụ' }).click();
    await expect(page).toHaveURL(/\/services$/);
  });
});
