import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';
import { onServer, simulateTransfer } from '../server/api';

/**
 * G3a — P-84 → P-88: chuyển khoản phí thành viên (D-41), chờ đối soát (D-31),
 * popup bắt buộc + banner cho TK chưa đóng phí (D-28, BR-03).
 */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const popup = (page: Page) => page.getByRole('dialog', { name: 'Gói dịch vụ' });
/** Prototype v4 `data-pg="1"`: Bảng giá mở từ menu là trang */
const pricingPage = (page: Page) => page.getByRole('region', { name: 'Gói dịch vụ' });
const payBox = (page: Page) => page.getByRole('dialog', { name: /^Thanh toán Gói / });

async function login(page: Page, email: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

test.describe('Chuyển khoản phí thành viên', () => {
  test('thông tin CK + sao chép; Quay lại về popup', async ({ page }) => {
    await login(page, 'an.nguyen@mediasoft.vn');
    await page.locator('aside').getByText('Gói dịch vụ', { exact: true }).click();
    await pricingPage(page).getByRole('button', { name: 'Gia hạn · 3.600.000đ/năm' }).click();
    await expect(page).toHaveURL(/\/membership\/pay$/);
    const box = payBox(page);
    await expect(box).toContainText(
      'Thanh toán Gói Doanh nghiệp · 3.600.000đ / năm (300.000đ/tháng)',
    );
    await expect(box).toContainText('1203132809');
    await expect(box).toContainText('Công ty cổ phần Tập đoàn Media Soft');
    await expect(box).toContainText('OPCHUB TV000001 0912345678');

    const copies = box.getByRole('button', { name: 'Sao chép' });
    await copies.nth(0).click();
    await expect(toast(page)).toHaveText('Đã sao chép số tài khoản');
    await copies.nth(1).click();
    await expect(toast(page)).toHaveText('Đã sao chép số tiền');
    await copies.nth(2).click();
    await expect(toast(page)).toHaveText('Đã sao chép nội dung chuyển khoản');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'OPCHUB TV000001 0912345678',
    );

    // Prototype `payBack` (payFrom 'sv') → Bảng giá dạng hộp nổi: có ×, × về trang trước
    await box.getByRole('button', { name: 'Quay lại' }).click();
    await expect(popup(page).getByText('Hỗ trợ phát triển doanh nghiệp')).toBeVisible();
    await popup(page).getByRole('button', { name: 'Đóng' }).click();
    await expect(popup(page)).toBeHidden();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe('TK chưa đóng phí (D-28)', () => {
  test('popup bắt buộc: không ×, Esc/nền chỉ nhắc; vẫn đăng ký tư vấn được; Đăng xuất', async ({
    page,
  }) => {
    await login(page, 'do.haiyen@opchub.vn');
    const p = popup(page);
    await expect(p.getByText('Cần thanh toán để tiếp tục')).toBeVisible();
    await expect(p.getByRole('button', { name: 'Đóng' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(toast(page)).toHaveText(
      'Vui lòng thanh toán phí thành viên để tiếp tục sử dụng OPC Hub',
    );
    await expect(p).toBeVisible();

    // Đi sang mục khác vẫn bị chặn
    await page.locator('aside').getByText('Cộng đồng', { exact: true }).dispatchEvent('click');
    await expect(p).toBeVisible();

    // Tư vấn dịch vụ vẫn dùng được (SRS §6)
    await p
      .getByRole('button', { name: /^Đăng ký (?!·)/ })
      .first()
      .click();
    await expect(p.getByText('Đăng ký tư vấn dịch vụ')).toBeVisible();
    await expect(p.getByText('THÔNG TIN CÁ NHÂN')).toBeVisible();
    await p.getByRole('button', { name: 'Gói dịch vụ' }).click();

    await p.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
    await expect(popup(page)).toHaveCount(0);
  });

  test('BUG-025 UAT-09 chuyển khoản → đang đối soát → webhook về → kích hoạt, popup tự đóng, không polling /me/membership mỗi giây', async ({
    page,
  }) => {
    await login(page, 'do.haiyen@opchub.vn');
    // Đếm GET /me/membership trong lúc chờ đối soát (mỗi giây = ~5 lần / 5 s)
    let polls = 0;
    page.on('request', (r) => {
      if (r.method() === 'GET' && new URL(r.url()).pathname.endsWith('/v1/me/membership'))
        polls += 1;
    });
    await popup(page)
      .getByRole('button', { name: /^Đăng ký · / })
      .click();
    const box = payBox(page);
    await expect(box).toContainText('OPCHUB TV000006 0935210987');
    // P-88: banner hiện khi hộp chuyển khoản không che popup
    await box.getByRole('button', { name: 'Tôi đã chuyển khoản' }).click();
    await expect(box.getByText('Đang đối soát giao dịch với Vietcombank…')).toBeVisible();
    await expect(box.getByRole('button', { name: 'Tôi đã chuyển khoản' })).toHaveCount(0);
    if (onServer) {
      // Server: kích hoạt về bằng `membership.updated` (socket) — chờ 5 s không được hỏi lại mỗi giây
      polls = 0;
      await page.waitForTimeout(5_000);
      expect(polls).toBeLessThanOrEqual(2);
    }
    // MSW tự hẹn giờ webhook (không có socket → poll dự phòng, V2Q-94); API thật: ngân hàng giả
    // báo tiền vào đúng nội dung CK (BR-04). Cùng assertion kết quả: popup đóng.
    if (onServer) await simulateTransfer('OPCHUB TV000006 0935210987');

    await expect(toast(page)).toHaveText(
      /^Đã nhận 1\.200\.000đ · tài khoản tự động kích hoạt đến/,
      {
        timeout: 10_000,
      },
    );
    await expect(box).toBeHidden();
    await expect(popup(page)).toBeHidden();
    await page.locator('aside').getByText('Cộng đồng', { exact: true }).click();
    await expect(page.getByText('Khám phá cộng đồng')).toBeVisible();
    await expect(popup(page)).toBeHidden();
  });

  test('banner chờ thanh toán (P-88): Thanh toán ngay mở hộp CK, × ẩn banner', async ({ page }) => {
    await login(page, 'do.haiyen@opchub.vn');
    await popup(page)
      .getByRole('button', { name: /^Đăng ký · / })
      .click();
    await payBox(page).getByRole('button', { name: 'Đóng' }).click();
    // Popup bắt buộc quay lại; đóng hộp CK lần nữa từ banner không thể vì popup che → kiểm banner qua DOM
    const banner = page.getByRole('alert').filter({
      hasText: 'Tài khoản đang chờ thanh toán phí thành viên',
    });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Thanh toán ngay' }).dispatchEvent('click');
    await expect(payBox(page)).toBeVisible();
    await payBox(page).getByRole('button', { name: 'Quay lại' }).click();
    await banner.getByRole('button', { name: 'Ẩn thông báo' }).dispatchEvent('click');
    await expect(banner).toHaveCount(0);
  });
});
