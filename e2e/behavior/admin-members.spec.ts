import { expect, test } from '../server/test';
import type { Locator, Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { lockMember, onServer } from '../server/api';

/** G4a — D-07 → D-17: Admin · Thành viên (app mới, MSW) */

const SEARCH = 'Tìm theo tên, email...';

const toast = (page: Page) => page.getByRole('status').filter({ visible: true });
const rowOf = (page: Page, name: string): Locator =>
  page.locator('[data-m="tbl"] > div > div').filter({ hasText: name }).first();

async function openMembers(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Thành viên', { exact: true }).click();
  await expect(page.getByText('· 8 tài khoản')).toBeVisible();
}

test.describe('Admin · Thành viên', () => {
  test('lọc loại + tìm ghi lên URL, đổi dạng lưới', async ({ page }) => {
    await openMembers(page);
    await page.getByRole('radio', { name: /Doanh nghiệp/ }).click();
    await expect(page).toHaveURL(/type=business/);
    await expect(rowOf(page, 'Lê Minh Anh')).toHaveCount(0);
    await expect(rowOf(page, 'Trần Quốc Bảo')).toBeVisible();

    await page.getByPlaceholder(SEARCH).fill('zzzz');
    await expect(page).toHaveURL(/q=zzzz/);
    await expect(page.getByText(/Hiển thị/)).toHaveCount(0);

    await page.getByPlaceholder(SEARCH).fill('solobooks');
    await expect(page.getByText('Hiển thị 1–1 / 1 thành viên')).toBeVisible();

    await page.getByRole('button', { name: 'Dạng lưới' }).click();
    await expect(page).toHaveURL(/view=grid/);
    await expect(page.getByRole('button', { name: 'Xem hồ sơ đăng ký →' })).toHaveCount(1);
  });

  test('phân trang 6 / trang → trang 2, giữ khi tải lại', async ({ page }) => {
    await openMembers(page);
    await expect(page.getByText('Hiển thị 1–8 / 8 thành viên')).toBeVisible();
    await page.getByRole('combobox', { name: 'Số dòng mỗi trang' }).selectOption('6');
    await page.getByRole('button', { name: 'Trang 2' }).click();
    await expect(page.getByText('Hiển thị 7–8 / 8 thành viên')).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    // Q-B62-18: API thật xếp theo ngày tham gia mới nhất → trang 2 là 2 TK cũ nhất
    await expect(rowOf(page, onServer ? 'Ngô Thành Đạt' : 'Hoàng Gia Linh')).toBeVisible();
  });

  test('chọn hàng loạt → khóa rồi mở khóa', async ({ page }) => {
    await openMembers(page);
    await page.getByRole('checkbox', { name: 'Chọn Lê Minh Anh' }).click();
    await page.getByRole('checkbox', { name: 'Chọn Trần Quốc Bảo' }).click();
    await expect(page.getByText('Đã chọn')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Chọn tất cả trên trang' })).toHaveAttribute(
      'aria-checked',
      'mixed',
    );
    // D-32: khoá phải xác nhận — Hủy thì không đổi gì, vẫn giữ lựa chọn
    await page.getByRole('button', { name: 'Khóa tài khoản' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Khóa tài khoản?' });
    await expect(confirm).toContainText('2 tài khoản sẽ không đăng nhập được');
    await confirm.getByText('Hủy', { exact: true }).click();
    await expect(rowOf(page, 'Lê Minh Anh').getByText('Hoạt động')).toBeVisible();
    await expect(page.getByText('Đã chọn')).toBeVisible();

    await page.getByRole('button', { name: 'Khóa tài khoản' }).click();
    await confirm.getByRole('button', { name: 'Khóa', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã khóa 2 tài khoản');
    await expect(page.getByText('Đã chọn')).toHaveCount(0);
    await expect(rowOf(page, 'Lê Minh Anh').getByText('Đã khóa')).toBeVisible();

    await page.getByRole('checkbox', { name: 'Chọn Lê Minh Anh' }).click();
    await page.getByRole('button', { name: 'Mở khóa', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã mở khóa 1 tài khoản');
    await expect(rowOf(page, 'Lê Minh Anh').getByText('Hoạt động')).toBeVisible();
  });

  test('menu ⋯: khóa một dòng, mở khóa Ngô Thành Đạt', async ({ page }) => {
    await openMembers(page);
    await page.getByRole('button', { name: 'Thao tác với Lê Minh Anh' }).click();
    await page.getByRole('menuitemradio', { name: 'Khóa tài khoản' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Khóa tài khoản?' });
    await expect(confirm).toContainText('Lê Minh Anh sẽ không đăng nhập được');
    await confirm.getByRole('button', { name: 'Khóa', exact: true }).click();
    await expect(toast(page)).toHaveText('Đã khóa · Lê Minh Anh');
    await expect(rowOf(page, 'Lê Minh Anh').getByText('Đã khóa')).toBeVisible();

    // Mở khoá làm ngay, không hỏi
    await page.getByRole('button', { name: 'Thao tác với Ngô Thành Đạt' }).click();
    await page.getByRole('menuitemradio', { name: 'Mở khóa' }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(rowOf(page, 'Ngô Thành Đạt').getByText('Hoạt động')).toBeVisible();
  });

  test('gán nhóm: bắt buộc chọn nhóm, nhóm đã tham gia bị khóa', async ({ page }) => {
    await openMembers(page);
    await page.getByRole('checkbox', { name: 'Chọn Lê Minh Anh' }).click();
    await page.getByRole('checkbox', { name: 'Chọn Trần Quốc Bảo' }).click();
    await page.getByRole('button', { name: '+ Gán vào nhóm' }).click();
    const dlg = page.getByRole('dialog', { name: 'Gán 2 thành viên vào nhóm' });
    await expect(dlg).toBeVisible();
    await expect(dlg.getByRole('checkbox', { name: /OPC Hà Nội/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await dlg.getByRole('button', { name: 'Gán vào nhóm' }).click();
    await expect(toast(page)).toHaveText('Vui lòng chọn ít nhất 1 nhóm');

    await dlg.getByPlaceholder('Tìm nhóm theo tên hoặc tỉnh/thành...').fill('Đà Nẵng');
    await dlg.getByRole('checkbox', { name: /OPC Đà Nẵng/ }).click();
    await expect(dlg.getByText('Đã chọn 1 nhóm')).toBeVisible();
    await dlg.getByRole('button', { name: 'Gán vào nhóm' }).click();
    await expect(toast(page)).toHaveText('Đã gán 2 thành viên vào 1 nhóm');
    await expect(dlg).toHaveCount(0);
    await expect(rowOf(page, 'Lê Minh Anh').getByText('+1')).toBeVisible();
  });

  test('đổi quyền hệ thống cần xác nhận (D-42)', async ({ page }) => {
    await openMembers(page);
    const select = rowOf(page, 'Lê Minh Anh').locator('select');
    await select.selectOption({ label: 'Quản trị viên' });
    await page.getByRole('alertdialog').getByText('Hủy', { exact: true }).click();
    await expect(select).toHaveValue('moderator');

    await select.selectOption({ label: 'Quản trị viên' });
    await expect(page.getByRole('alertdialog')).toContainText('Điều phối viên → Quản trị viên');
    await page.getByRole('button', { name: 'Đổi quyền' }).click();
    await expect(toast(page)).toHaveText('Đã cập nhật vai trò Lê Minh Anh');
    await expect(select).toHaveValue('admin');
  });

  test('drawer hồ sơ: xác minh DN chờ duyệt (D-40); từ chối phải xác nhận', async ({ page }) => {
    await openMembers(page);
    await page.getByRole('button', { name: /^Nguyễn Văn An an\./ }).click();
    const drawer = page.getByRole('dialog', { name: 'Hồ sơ đăng ký' });
    await expect(drawer.getByText('0101234567')).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Xác minh doanh nghiệp' })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await expect(rowOf(page, 'Rina Sari').getByText('Chờ xác minh')).toBeVisible();
    await page.getByRole('button', { name: /^Rina Sari rina/ }).click();
    await drawer.getByRole('button', { name: 'Từ chối' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Từ chối hồ sơ doanh nghiệp?' });
    await confirm.getByText('Hủy', { exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await drawer.getByRole('button', { name: 'Xác minh doanh nghiệp' }).click();
    await expect(toast(page)).toHaveText('Đã xác minh PT Nusantara Teknologi');
    await expect(drawer.getByRole('button', { name: 'Xác minh doanh nghiệp' })).toHaveCount(0);
    await expect(rowOf(page, 'Rina Sari').getByText('Hoạt động')).toBeVisible();
  });
});

test.describe('Khoá tài khoản lan truyền (TIP-V2-104)', () => {
  test('UAT-24 REQ-216 khoá thành viên → phiên Portal đang mở về đăng nhập, báo đã khoá', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
    await page.locator('input[type=password]').fill('User@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByText('Thành viên đang tham gia hoạt động')).toBeVisible();

    // Admin khoá TK đang mở. API thật: socket nhận `session.revoked {locked}` (relay outbox);
    // MSW không có socket: cookie giả → request kế tiếp nhận 403 khoá như guard thật
    if (onServer) await lockMember('an.nguyen@mediasoft.vn');
    else {
      await context.addCookies([{ name: 'opchub-mock-locked', value: '1', url: PORTAL_URL }]);
      await page.locator('aside').getByText('Sự kiện sắp tới', { exact: true }).click();
    }

    await expect(page).toHaveURL(/\/login\?reason=locked$/, { timeout: 10_000 });
    await expect(page.locator('form').getByRole('alert')).toHaveText(
      'Tài khoản đã bị khóa, liên hệ hỗ trợ',
    );
    await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  });
});
