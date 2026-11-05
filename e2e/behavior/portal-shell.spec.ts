import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';
import { completeDeclaration } from './helpers/declaration';

/** G2a — P-01 → P-16: Dashboard + khung app Portal (app mới, MSW) */

async function login(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByText('Hướng dẫn bắt đầu', { exact: true })).toBeVisible();
}

test.describe('Dashboard', () => {
  test('D-89 Dashboard v4: lời chào + Hướng dẫn bắt đầu, không còn khối LIVE, không gọi /dashboard/live', async ({
    page,
  }) => {
    let live = 0;
    page.on('request', (r) => {
      if (new URL(r.url()).pathname === '/v1/dashboard/live') live += 1;
    });
    await login(page);
    await expect(page.getByText(/^Chào buổi (sáng|trưa|chiều|tối), An$/)).toBeVisible();
    await expect(page.getByText(/^Đã xong \d+\/\d+ bước · \d+%$/)).toBeVisible();
    for (const gone of ['Thành viên đang tham gia hoạt động', 'Hoạt động trực tiếp'])
      await expect(page.getByText(gone)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tham gia thảo luận →' })).toHaveCount(0);
    expect(live).toBe(0);
  });
});

test.describe('Khung app', () => {
  test('REQ-210 NA-10 mở chuông → đã đọc (số về 0, giữ sau tải lại); mở nhắc tên vào chat', async ({
    page,
  }) => {
    await login(page);
    const bell = page.getByRole('button', { name: 'Thông báo' });
    await expect(bell).toContainText('2');
    await bell.click();
    // danh sách đang mở vẫn cho thấy tin mới (tab Chưa đọc giữ 2), chuông đã về 0
    await expect(page.getByRole('tab', { name: 'Chưa đọc (2)' })).toBeVisible();
    await expect(bell).not.toContainText('2');
    await page.getByRole('tab', { name: 'Tất cả' }).click();
    await page.getByText('Lê Minh Anh nhắc đến bạn trong #Hỏi đáp').click();
    await expect(page).toHaveURL(/\/chat\/c1\/qa/);
    // đã ghi ở server: hộp thư báo unread = 0
    const unread = await page.evaluate(async () => {
      const auth = await fetch('/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      const token = auth.ok ? ((await auth.json()) as { accessToken: string }).accessToken : '';
      const r = await fetch('/v1/notifications?size=50', {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      return ((await r.json()) as { unread: number }).unread;
    });
    expect(unread).toBe(0);
    await bell.click();
    await expect(page.getByRole('tab', { name: 'Chưa đọc (0)' })).toBeVisible();
    await page.getByRole('tab', { name: 'Chưa đọc (0)' }).click();
    await expect(page.getByText('Không có thông báo')).toBeVisible();
  });

  test('ngôn ngữ, menu người dùng, Trang chủ, sự kiện sắp tới', async ({ page }) => {
    await login(page);
    // D-133 (owner 05/11/2026): keep the selected country's flag, overriding the globe prototype.
    const lang = page.getByRole('button', { name: 'Tiếng Việt' });
    await expect(lang.locator('img')).toHaveCount(1);
    await expect(lang.locator('img')).toHaveAttribute('src', 'https://flagcdn.com/w80/vn.png');
    await expect(lang.locator('svg').first()).toBeVisible();
    await lang.click();
    await expect(page.getByText('CHỌN QUỐC GIA & NGÔN NGỮ')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.locator('[data-m="me"]').click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'Hồ sơ cá nhân' })).toBeVisible();
    await expect(menu.getByText(/Chuyển sang/)).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.locator('aside').getByText('Cộng đồng', { exact: true }).click();
    await page.getByRole('button', { name: 'Trang chủ' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // TIP-V4-606: chân sidebar v4 là thẻ gói (prototype `sbFoot`) thay "Sự kiện sắp tới"
    const card = page.locator('aside').getByRole('region', { name: 'Gói thành viên' });
    await expect(card.getByText('Gói Doanh nghiệp', { exact: true })).toBeVisible();
    await expect(card.getByText('Đang hoạt động', { exact: true })).toBeVisible();
    await expect(card.getByText(/^Còn \d+ ngày$/)).toBeVisible();
    await expect(
      page.locator('aside').getByRole('region', { name: 'Sự kiện sắp tới' }),
    ).toHaveCount(0);
    await card.getByRole('button', { name: 'Xem bảng giá' }).click();
    await expect(page).toHaveURL(/\/services$/);
    // mở từ thẻ gói = hộp nổi (svPop), × về trang trước
    const pop = page.getByRole('dialog', { name: 'Gói dịch vụ' });
    await expect(pop.getByText('BẢNG GIÁ THÀNH VIÊN')).toBeVisible();
    await pop.getByRole('button', { name: 'Đóng' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('REQ-514 D-80 menu §27.3: 3 nhóm, thứ tự v4, nhãn Bảng giá / Mạng lưới Affiliate', async ({
    page,
  }) => {
    await login(page);
    const nav = page.locator('aside nav');
    await expect(nav.getByRole('link')).toHaveText([
      'Dashboard',
      /^Chat nhóm/,
      'Cộng đồng',
      'Sự kiện sắp tới',
      'Nhu cầu địa phương',
      'Gian hàng địa phương',
      'Dự án OPC',
      'Bảng giá',
      'Mạng lưới Affiliate',
    ]);
    for (const h of ['CỘNG ĐỒNG', 'KẾT NỐI KINH DOANH', 'TÀI KHOẢN']) {
      await expect(nav.getByText(h, { exact: true })).toBeVisible();
    }
  });

  test('thu gọn sidebar 76px, nhớ sau khi tải lại trang', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Thu gọn sidebar' }).click();
    await expect(page.locator('aside')).toHaveCSS('width', '76px');
    expect(await page.evaluate(() => localStorage.getItem('opc-sb-mini'))).toBe('1');
    await page.getByRole('button', { name: 'Mở rộng sidebar' }).click();
    await expect(page.locator('aside')).toHaveCSS('width', '248px');
  });

  test('mobile: drawer mở bằng Menu, đóng khi chọn mục', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    const aside = page.locator('aside');
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(aside).toHaveAttribute('data-open', 'true');
    await aside.getByText('Cộng đồng', { exact: true }).click();
    await expect(aside).toHaveAttribute('data-open', 'false');
    await expect(page).toHaveURL(/\/community/);
  });
});

test('đăng ký xong: modal mail chào mừng một lần, không có mật khẩu tạm (D-30)', async ({
  page,
}) => {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByText('Đăng ký', { exact: true }).first().click();
  await page.getByText('Cá nhân', { exact: true }).click();
  await page.getByPlaceholder('ban@congty.vn', { exact: true }).fill('welcome@x.vn');
  await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await page.locator('input[inputmode=numeric]').first().fill('123456');
  await page.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
  await expect(page).toHaveURL(/\/community$/);

  const dialog = page.getByRole('dialog', { name: 'Đã gửi email chào mừng' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('welcome@x.vn').first()).toBeVisible();
  await expect(dialog.getByText('Mật khẩu tạm')).toHaveCount(0);
  // D-91 (5): khối truy cập như prototype v4, dòng mật khẩu chỉ nhắc — không lộ giá trị (D-47)
  await expect(dialog.getByText('Do bạn tự đặt')).toBeVisible();
  await expect(dialog.getByText(/OPC-[A-Z0-9]{4,}/)).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Đóng' }).click();
  await expect(dialog).toBeHidden();
  // V4-607 (prototype v4): sau mail chào mừng là popup khai báo
  await completeDeclaration(page);
  // D-94 1A: TK mới miễn phí 3 tháng → không có Bảng giá bắt buộc
  await expect(page.getByRole('dialog', { name: 'Gói dịch vụ' })).toHaveCount(0);
  await page.locator('aside').getByText('Dashboard', { exact: true }).click();
  await expect(page.getByText('Hướng dẫn bắt đầu', { exact: true })).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test('FX-03: đăng ký A (popup mail chào mừng) → đăng xuất → đăng nhập B: không hiện popup của A', async ({
  page,
}) => {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByText('Đăng ký', { exact: true }).first().click();
  await page.getByText('Cá nhân', { exact: true }).click();
  await page.getByPlaceholder('ban@congty.vn', { exact: true }).fill(`fx03-${Date.now()}@x.vn`);
  await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await page.locator('input[inputmode=numeric]').first().fill('123456');
  await page.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
  const dialog = page.getByRole('dialog', { name: 'Đã gửi email chào mừng' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Đóng' }).click();
  await completeDeclaration(page);

  await page.locator('button[data-m="me"]').click();
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByText('Hướng dẫn bắt đầu', { exact: true })).toBeVisible();
  await expect(dialog).toHaveCount(0);
});
