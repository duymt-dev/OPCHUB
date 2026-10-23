import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';

/**
 * TIP-V2-302 — popup Gói dịch vụ V4 (UP-07 §23.5, AT-LK04/05, NR-R02, D-58, D-60). Chạy msw + server,
 * cùng assertion (D-63). TK chưa đóng phí: Đỗ Hải Yến (popup bắt buộc).
 */

const popup = (page: Page) => page.getByRole('dialog', { name: 'Gói dịch vụ' });
const payBox = (page: Page) => page.getByRole('dialog', { name: /^Thanh toán Gói / });

async function loginUnpaid(page: Page, width = 1366, height = 768) {
  await page.setViewportSize({ width, height });
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('do.haiyen@opchub.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await expect(popup(page).getByText('Hỗ trợ phát triển doanh nghiệp')).toBeVisible();
}

/**
 * Bảng giá v4 (prototype `_svFit`, D-79): hộp nằm gọn trong khung nhìn, tự cuộn bên trong
 * (cao tối đa 90vh); trang phía sau không cuộn.
 */
async function noScroll(page: Page) {
  // V4-605 danh mục v4: 15 mục, 10 đang bật (tắt: tools, match, mkt, export, data)
  await expect(popup(page).getByRole('button', { name: /^Đăng ký (?!·)/ })).toHaveCount(10);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const d = document.querySelector('[role=dialog][aria-label="Gói dịch vụ"]');
        const s = document.scrollingElement;
        if (!d || !s) return 'missing';
        const r = d.getBoundingClientRect();
        return [
          d.clientHeight <= window.innerHeight * 0.9 + 1 &&
            getComputedStyle(d).overflowY === 'auto',
          // trang phía sau: không thanh cuộn (khoá cuộn khi popup mở, hoặc vốn vừa màn)
          s.scrollHeight <= s.clientHeight + 1 || getComputedStyle(s).overflowY === 'hidden',
          r.top >= -1 && r.bottom <= window.innerHeight + 1,
        ].join(',');
      }),
    )
    .toBe('true,true,true');
}

test.describe('Popup Gói dịch vụ V4', () => {
  test('AT-LK04 REQ-501 1366×768: Bảng giá 3 gói trong khung nhìn, trang nền khoá cuộn; 390px: không tràn ngang', async ({
    page,
  }) => {
    await loginUnpaid(page);
    const p = popup(page);
    // D-68: TK chưa đóng phí (Cá nhân) — nút gói mình "Đăng ký", Gói Gọi vốn khoá tới khi có phí
    await expect(p.getByText('BẢNG GIÁ THÀNH VIÊN')).toBeVisible();
    await expect(p.getByRole('button', { name: 'Đăng ký · 1.200.000đ/năm' })).toBeEnabled();
    await expect(p.getByRole('button', { name: 'Dành cho tài khoản Doanh nghiệp' })).toBeDisabled();
    await expect(p.getByRole('button', { name: 'Kích hoạt gói thành viên trước' })).toBeDisabled();
    await expect(p.getByRole('button', { name: 'Đăng ký Sự kiện & Tài trợ' })).toBeVisible();
    await noScroll(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(p.getByRole('button', { name: 'Đăng ký Cộng đồng & Kết nối' })).toBeAttached();
    const overflow = await page.evaluate(() => {
      const d = document.querySelector('[role=dialog][aria-label="Gói dịch vụ"]');
      return d ? d.scrollWidth - d.clientWidth : -1;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('REQ-409 REQ-501 LK-09 UAT-08 Đăng ký gói → hộp CK có điều kiện không hoàn lại (AT-NR01)', async ({
    page,
  }) => {
    await loginUnpaid(page);
    await popup(page)
      .getByRole('button', { name: /^Đăng ký · / })
      .click();
    const box = payBox(page);
    await expect(box).toContainText(/OPCHUB TV\d{6} 09\d{8}/);
    await expect(box).toContainText('Thanh toán Gói Cá nhân · 1.200.000đ / năm (100.000đ/tháng)');
    await expect(box.getByText(/Điều kiện thanh toán:/)).toBeVisible();
    await expect(box).toContainText('không hoàn lại');
    await expect(box).toContainText(
      'Bấm “Tôi đã chuyển khoản” đồng nghĩa bạn đồng ý với điều kiện này.',
    );
  });

  // Q-V4-605-4: danh mục v4 tắt "Công cụ & Giải pháp số" → AT-LK05 đi qua dịch vụ đang bật
  test('AT-LK05 REQ-408 Đăng ký tư vấn "Đào tạo & Ươm mầm OPC" → phiếu ở Admin › Dịch vụ', async ({
    page,
  }) => {
    await loginUnpaid(page);
    const p = popup(page);
    await p.getByRole('button', { name: 'Đăng ký Đào tạo & Ươm mầm OPC' }).click();
    await expect(p.getByText('Đăng ký tư vấn dịch vụ')).toBeVisible();
    await p.getByLabel('Nghề nghiệp / vai trò').selectOption({ label: 'Freelancer' });
    await p.getByLabel('Tỉnh / thành').selectOption({ label: 'Hà Nội' });
    await p.getByRole('textbox', { name: /Mô tả nhu cầu/ }).fill('Cần CRM + website cho OPC');
    const created = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/v1\/service-requests$/.test(r.url()),
    );
    await p.getByRole('button', { name: 'Gửi yêu cầu' }).click();
    const res = await created;
    expect(res.status()).toBe(201);
    const { code } = (await res.json()) as { code: string };
    await expect(p.getByText('Đã gửi yêu cầu tư vấn')).toBeVisible();

    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await page.locator('input[type=email]').fill('admin@opchub.community');
    await page.locator('input[type=password]').fill('Admin@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await page.locator('aside').getByText('Dịch vụ', { exact: true }).click();
    await expect(page.getByText('Yêu cầu đăng ký dịch vụ')).toBeVisible();
    const row = page.locator('[data-m="tbl"]').getByRole('row').filter({ hasText: code });
    await expect(row).toContainText('Đào tạo & Ươm mầm OPC');
    await expect(row).not.toContainText('Mới đăng ký');
  });

  test('AT-NR01 REQ-382 câu "không hoàn lại" ở form đăng ký cá nhân + DN', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/register?type=per`, { waitUntil: 'networkidle' });
    await expect(
      page.getByText(
        'Tôi đồng ý với Điều khoản sử dụng, Chính sách bảo mật và Chính sách phí thành viên của OPC Hub (phí Gói Cá nhân 1.200.000đ/năm · Gói Doanh nghiệp 3.600.000đ/năm, không hoàn lại sau khi thanh toán).',
      ),
    ).toBeVisible();
    await page.goto(`${PORTAL_URL}/register?type=biz`, { waitUntil: 'networkidle' });
    await expect(
      page.getByText(/đại diện hợp pháp.*không hoàn lại sau khi thanh toán/),
    ).toBeVisible();
  });
});
