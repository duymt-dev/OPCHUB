import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { onServer } from '../server/api';

/** G6b — D-78 / D-79 Admin Marketing (prototype không có lối vào; D-33: mục menu admin) */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const table = (page: Page) => page.getByRole('table', { name: 'Danh sách chiến dịch' });
const row = (page: Page, name: string) => table(page).getByRole('row').filter({ hasText: name });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Tạo chiến dịch email' });
const confirmBox = (page: Page) => page.getByRole('alertdialog');

async function openMarketing(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Marketing', { exact: true }).click();
  await expect(page).toHaveURL(/\/marketing$/);
  await expect(row(page, 'Bản tin tháng 10')).toBeVisible();
}

test.describe('Admin · Marketing', () => {
  test('vào từ menu: thống kê, bảng chiến dịch, tab trên URL', async ({ page }) => {
    await openMarketing(page);
    await expect(page.getByRole('heading', { name: 'Marketing' })).toBeVisible();
    await expect(page.getByText('4.052', { exact: true })).toBeVisible();
    await expect(page.getByText('42%', { exact: true })).toBeVisible();
    const cp1 = row(page, 'Mời tham gia OPC Day Hà Nội');
    await expect(cp1).toContainText('Nhóm: OPC Hà Nội, OPC Bắc Ninh');
    await expect(cp1).toContainText('12/10/2026 09:00');
    await expect(cp1.getByRole('button', { name: 'Gửi ngay' })).toHaveCount(0);

    await page.getByRole('tab', { name: 'Email tự động' }).click();
    await expect(page).toHaveURL(/tab=auto/);
    await expect(
      page.getByText('Tự động gửi sau mỗi lần đăng ký thành công', { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Tạo chiến dịch' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Chiến dịch' }).click();
    await expect(page).not.toHaveURL(/tab=/);
  });

  test('tạo chiến dịch: kiểm lỗi, ước tính người nhận, gửi ngay có xác nhận', async ({ page }) => {
    await openMarketing(page);
    await page.getByRole('button', { name: '+ Tạo chiến dịch' }).click();
    const s = sheet(page);
    // Q-B62-17: MSW nhân số thành viên mẫu (x480); API thật đếm người nhận thật trong CSDL
    const est = onServer ? /^Ước tính \d[\d.]* người nhận$/ : 'Ước tính 3.840 người nhận';
    await expect(s.getByText(est)).toBeVisible();

    await s.getByRole('button', { name: 'Gửi ngay' }).click();
    await expect(toast(page)).toHaveText('Vui lòng nhập tên chiến dịch');
    await s.getByPlaceholder('VD: Thư mời OPC Day Đà Nẵng').fill('Thư mời OPC Day Đà Nẵng');
    await s.getByRole('button', { name: 'Gửi ngay' }).click();
    await expect(toast(page)).toHaveText('Vui lòng nhập tiêu đề email');
    await s.getByPlaceholder('VD: [OPC Hub] Thư mời sự kiện tháng 11').fill('[OPC Hub] Mời bạn');

    await s.getByRole('radio', { name: 'Theo nhóm cộng đồng' }).click();
    await expect(s.getByText('Ước tính 0 người nhận')).toBeVisible();
    await s.getByRole('button', { name: 'Gửi ngay' }).click();
    await expect(toast(page)).toHaveText('Vui lòng chọn ít nhất 1 nhóm');
    await s.getByRole('button', { name: 'OPC Hà Nội', exact: true }).click();
    await expect(s.getByText('Ước tính 1.248 người nhận')).toBeVisible();
    await s.getByRole('button', { name: 'OPC Đà Nẵng', exact: true }).click();
    await expect(s.getByText('Ước tính 1.902 người nhận')).toBeVisible();

    await s.getByRole('button', { name: 'Lên lịch' }).click();
    await expect(toast(page)).toHaveText('Vui lòng chọn thời gian gửi');

    await s.getByRole('button', { name: 'Gửi ngay' }).click();
    const c = confirmBox(page);
    await expect(c).toContainText('Gửi chiến dịch ngay?');
    await expect(c).toContainText('1.902 người nhận');
    await c.getByRole('button', { name: 'Hủy' }).click();
    await expect(c).toHaveCount(0);
    await expect(s).toBeVisible();

    await s.getByRole('button', { name: 'Gửi ngay' }).click();
    await confirmBox(page).getByRole('button', { name: 'Gửi ngay' }).click();
    await expect(toast(page)).toHaveText('Đang gửi tới 1.902 người nhận');
    await expect(s).toHaveCount(0);
    const fresh = row(page, 'Thư mời OPC Day Đà Nẵng');
    await expect(fresh).toContainText('Nhóm: OPC Hà Nội, OPC Đà Nẵng');
    await expect(fresh).toContainText('Đang gửi');
  });

  test('mẫu email điền sẵn; lưu nháp', async ({ page }) => {
    await openMarketing(page);
    await page.getByRole('button', { name: '+ Tạo chiến dịch' }).click();
    const s = sheet(page);
    await s.getByRole('button', { name: /^Bản tin tháng/ }).click();
    await expect(s.getByPlaceholder('VD: Thư mời OPC Day Đà Nẵng')).toHaveValue(
      'Bản tin OPC Hub tháng [MM/YYYY]',
    );
    await expect(s.getByRole('textbox', { name: 'Nội dung' })).toContainText('Sự kiện sắp tới');
    await s.getByRole('button', { name: '{{ten}}' }).click();
    await expect(s.getByRole('textbox', { name: 'Nội dung' })).toContainText('{{ten}}');
    await s.getByRole('button', { name: 'Lưu nháp' }).click();
    await expect(toast(page)).toHaveText('Đã lưu bản nháp');
    await expect(row(page, 'Bản tin OPC Hub tháng [MM/YYYY]')).toContainText('Bản nháp');
  });

  test('gửi ngay nháp có xác nhận; nhân bản; xóa có xác nhận', async ({ page }) => {
    await openMarketing(page);
    const draft = row(page, 'Nhắc hoàn thiện hồ sơ');
    await draft.getByRole('button', { name: 'Gửi ngay' }).click();
    await expect(confirmBox(page)).toContainText(
      onServer ? /\d[\d.]* người nhận/ : '1.920 người nhận',
    );
    await confirmBox(page).getByRole('button', { name: 'Gửi ngay' }).click();
    await expect(toast(page)).toHaveText('Đang gửi Nhắc hoàn thiện hồ sơ');
    await expect(draft).toContainText('Đang gửi');
    await expect(draft.getByRole('button', { name: 'Gửi ngay' })).toHaveCount(0);
    await expect(draft.getByRole('button', { name: 'Xóa' })).toBeDisabled();

    await row(page, 'Kêu gọi đăng dự án gọi vốn').getByRole('button', { name: 'Nhân bản' }).click();
    const s = sheet(page);
    await expect(s.getByPlaceholder('VD: Thư mời OPC Day Đà Nẵng')).toHaveValue(
      'Kêu gọi đăng dự án gọi vốn (bản sao)',
    );
    await expect(s.getByRole('radio', { name: 'Doanh nghiệp' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await s.getByRole('button', { name: 'Lưu nháp' }).click();
    await expect(row(page, 'Kêu gọi đăng dự án gọi vốn (bản sao)')).toBeVisible();

    // Bản gốc (bản sao cùng tiêu đề nhưng tên có "(bản sao)")
    const cp3 = row(page, 'Kêu gọi đăng dự án gọi vốn').filter({ hasNotText: '(bản sao)' });
    await cp3.getByRole('button', { name: 'Xóa' }).click();
    await expect(confirmBox(page)).toContainText('Xóa chiến dịch?');
    await confirmBox(page).getByRole('button', { name: 'Hủy' }).click();
    await expect(cp3).toBeVisible();
    await cp3.getByRole('button', { name: 'Xóa' }).click();
    await confirmBox(page).getByRole('button', { name: 'Xóa' }).click();
    await expect(toast(page)).toHaveText('Đã xóa chiến dịch');
    await expect(cp3).toHaveCount(0);
  });

  test('tab nhật ký gửi: xem email, gửi lại', async ({ page }) => {
    await openMarketing(page);
    await page.getByRole('tab', { name: 'Nhật ký gửi' }).click();
    await expect(page).toHaveURL(/tab=log/);
    const log = page.getByRole('list', { name: 'Nhật ký gửi email' });
    const lan = log.getByRole('listitem').filter({ hasText: 'hoang.lan@gmail.com' });
    await expect(lan).toContainText('Chào mừng');
    await lan.getByRole('button', { name: 'Gửi lại' }).click();
    await expect(toast(page)).toHaveText('Đã gửi lại tới hoang.lan@gmail.com');

    await lan.getByRole('button', { name: 'Xem' }).click();
    const dlg = page.getByRole('dialog', { name: 'Đã gửi email chào mừng' });
    await expect(dlg).toContainText('Chào mừng Hoàng Thị Lan!');
    await expect(dlg).toContainText('Quy định hoạt động trên nền tảng');
    await page.keyboard.press('Escape');
    await expect(dlg).toHaveCount(0);
  });
});
