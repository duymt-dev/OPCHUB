import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';
import { completeDeclaration } from './helpers/declaration';
import { onServer, payFee } from '../server/api';
import { dashboardLiveSchema } from '@opchub/shared/api-domains';
import { publishDashboardOpening } from './helpers/bot-publication';

/** G2a — P-01 → P-16: Dashboard + khung app Portal (app mới, MSW) */

async function login(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByText('Thành viên đang tham gia hoạt động')).toBeVisible();
}

const botDashboardTest = test.extend({ botManual: true });

test.describe('Dashboard', () => {
  test('REQ-224 BUG-012 không còn dữ liệu mô phỏng; lọc LIVE + cỡ trang ghi URL; chọn thành viên', async ({
    page,
  }) => {
    await login(page);
    // Bộ mô phỏng prototype (D_P) đã bỏ — dữ liệu từ API (server: DB thật, MSW: store giả)
    if (onServer) {
      // tên chỉ có trong bộ mô phỏng `D_P` của prototype (không phải thành viên demo)
      for (const fake of ['Rina Santoso', 'Aiman Hakim', 'Tan Wei Ling'])
        await expect(page.getByText(fake)).toHaveCount(0);
    }
    await expect(page.getByText(/^Hiển thị 1–\d+ \/ \d+ thành viên$/)).toBeVisible();

    await page.getByRole('combobox', { name: 'Số dòng mỗi trang' }).selectOption('8');
    await expect(page).toHaveURL(/size=8/);
    await page.getByRole('radio', { name: /^Online/ }).click();
    await expect(page).toHaveURL(/live=online/);
    await page.getByRole('radio', { name: /Tất cả/ }).click();
    await expect(page).not.toHaveURL(/live=online/);

    // số liệu làm mới 3 giây (NA-24) có thể đổi thứ tự → giữ ô theo tên, không theo vị trí
    const id = (await page.locator('[data-member]').first().getAttribute('data-member')) ?? '';
    const tile = page.locator(`[data-member="${id}"]`);
    await tile.click();
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
  });

  test('REQ-224 NA-24 tin vừa gửi hiện ở Hoạt động trực tiếp trong ≤ 3 giây (không tải lại)', async ({
    page,
  }) => {
    await login(page);
    const feed = page.locator('section').filter({ hasText: 'Hoạt động trực tiếp' });
    await expect(feed.locator('b').first()).toBeVisible();
    const before = await feed.getByText('OPC Đà Nẵng', { exact: true }).count();
    // Gửi tin vào nhóm khác bằng API (cùng phiên), Dashboard không thao tác gì
    await page.evaluate(async () => {
      const auth = await fetch('/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      const token = auth.ok ? ((await auth.json()) as { accessToken: string }).accessToken : '';
      await fetch('/v1/groups/c3/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ agreeRules: true }),
      });
      await fetch('/v1/rooms/c3-general/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ clientMsgId: crypto.randomUUID(), body: 'Chào Đà Nẵng' }),
      });
    });
    // 2 mục mới: tham gia OPC Đà Nẵng + nhắn tin trong OPC Đà Nẵng
    await expect(feed.getByText('OPC Đà Nẵng', { exact: true })).toHaveCount(before + 2, {
      timeout: 6_000,
    });
  });

  botDashboardTest('"Tham gia thảo luận →" mở chat nhóm', async ({ page, context }) => {
    const admin = await context.newPage();
    const publication = await publishDashboardOpening(admin);
    const live = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/v1/dashboard/live' && r.status() === 200,
    );
    await login(page);
    dashboardLiveSchema.parse(await (await live).json());
    const card = page.locator('article').filter({ hasText: publication.body });
    await expect(card).toHaveCount(1, { timeout: 20000 });
    await expect(card.getByText(publication.body, { exact: true })).toBeVisible();
    const refreshed = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/v1/dashboard/live' && r.status() === 200,
    );
    await page.reload();
    const data = dashboardLiveSchema.parse(await (await refreshed).json());
    const opening = data.threads.find((row) => row.body === publication.body);
    expect(opening?.groupId).toBe(publication.groupId);
    expect(Date.parse(opening?.at ?? '')).toBeGreaterThanOrEqual(
      Date.parse(publication.admittedAt),
    );
    await expect(card).toHaveCount(1, { timeout: 20000 });
    await card.getByRole('button', { name: 'Tham gia thảo luận →' }).click();
    await expect(page).toHaveURL(/\/chat\/c1/);
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
    await page.getByRole('button', { name: 'Tiếng Việt' }).click();
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
  await page.getByText('Chuyên gia', { exact: true }).click();
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
  await dialog.getByRole('button', { name: 'Đóng' }).click();
  await expect(dialog).toBeHidden();
  // V4-607 (prototype v4): sau mail chào mừng là popup khai báo, rồi Bảng giá
  await completeDeclaration(page);
  // TK mới chờ thanh toán phí → popup bắt buộc che nền (BR-03, G3a); bấm mục bằng sự kiện DOM
  await expect(page.getByRole('dialog', { name: 'Gói dịch vụ' })).toBeVisible();
  // Q-B62-20: API thật chặn /dashboard/live khi chưa đóng phí (đăng nhập + phí) → đóng phí trước
  if (onServer) await payFee(page);
  await page.locator('aside').getByText('Dashboard', { exact: true }).dispatchEvent('click');
  await expect(page.getByText('Thành viên đang tham gia hoạt động')).toBeVisible();
  await expect(dialog).toHaveCount(0);
});
