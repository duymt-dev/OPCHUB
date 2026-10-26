import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { onServer, reviseProject } from '../server/api';

/** G5b — D-51 → D-57: Admin "Dự án" · Kiểm duyệt dự án (app mới, MSW) */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Xem & duyệt dự án' });
const confirmBox = (page: Page) => page.getByRole('alertdialog');
const tab = (page: Page, label: string) => page.getByRole('tab', { name: new RegExp(`^${label}`) });
const card = (page: Page, name: string) => page.locator('article').filter({ hasText: name });

async function openProjects(page: Page) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Dự án OPC', { exact: true }).click();
  await expect(page.getByText('Kiểm duyệt dự án')).toBeVisible();
}

async function review(page: Page, name: string) {
  await card(page, name).getByRole('button').first().click();
  await expect(drawer(page)).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/p\d+\/review/);
}

test.describe('Admin · Kiểm duyệt dự án', () => {
  test('tab, kiểu xem, trống — trạng thái trên URL', async ({ page }) => {
    await openProjects(page);
    await expect(tab(page, 'Chờ duyệt')).toContainText('2');
    await expect(page.getByText('Hiển thị 1–2 / 2 dự án')).toBeVisible();

    await tab(page, 'Đang hiển thị').click();
    await expect(page).toHaveURL(/tab=live/);
    await expect(page.getByText('Hiển thị 1–6 / 6 dự án')).toBeVisible();
    await expect(page.getByLabel('Số dự án mỗi trang')).toHaveValue('10');

    await tab(page, 'Bị từ chối').click();
    await expect(page.getByText('Không có dự án trong mục này.')).toBeVisible();

    await tab(page, 'Đã ẩn').click();
    await page.getByTitle('Dạng danh sách').click();
    await expect(page).toHaveURL(/view=list/);
    await expect(page.locator('[data-m="tbl"]')).toContainText('OPC Legal Docs');
  });

  test('duyệt, yêu cầu chỉnh sửa, từ chối (xác nhận) — badge cập nhật', async ({ page }) => {
    await openProjects(page);
    await review(page, 'HalalLink');
    await expect(drawer(page)).toContainText(
      'GitHub · Public · https://github.com/halallink/platform',
    );
    await drawer(page).getByRole('button', { name: 'Duyệt & xuất bản' }).click();
    await expect(toast(page)).toHaveText('Đã duyệt & xuất bản · HalalLink');
    await expect(drawer(page)).toBeHidden();
    await expect(page).toHaveURL(/\/projects(\?|$)/);
    await expect(tab(page, 'Chờ duyệt')).toContainText('1');
    await expect(tab(page, 'Đang hiển thị')).toContainText('7');

    await review(page, 'EduMate');
    await drawer(page).getByRole('button', { name: 'Yêu cầu chỉnh sửa' }).click();
    await expect(toast(page)).toHaveText('Nhập lý do hoặc lời nhắn để yêu cầu chỉnh sửa');
    await drawer(page).getByRole('button', { name: 'Từ chối' }).click();
    await expect(toast(page)).toHaveText('Vui lòng chọn lý do từ chối');
    await drawer(page).getByLabel('Lý do').selectOption('Nội dung quảng cáo / spam');
    await drawer(page).getByRole('button', { name: 'Từ chối' }).click();
    await expect(confirmBox(page)).toContainText('Từ chối dự án?');
    await confirmBox(page).getByRole('button', { name: 'Từ chối' }).click();
    await expect(toast(page)).toHaveText('Đã từ chối · EduMate');
    await expect(page.getByText('Không còn dự án nào chờ duyệt')).toBeVisible();

    await tab(page, 'Bị từ chối').click();
    await card(page, 'EduMate').getByRole('button', { name: 'Xem' }).click();
    await expect(drawer(page)).toContainText('Ghi chú lần duyệt trước: Nội dung quảng cáo / spam');
    await expect(drawer(page).getByRole('button', { name: 'Duyệt & xuất bản' })).toHaveCount(0);
  });

  test('REQ-106 bản sửa chờ duyệt → duyệt → hiển thị bản mới', async ({ page, context }) => {
    // Chủ dự án An sửa "OPC Hub Mobile" (p10, đang hiển thị) + gửi duyệt. Server: qua API thật;
    // MSW: Portal và Admin là hai CSDL giả → cookie dựng sẵn bản sửa (D-63, V2Q-102)
    const NEW = 'OPC Hub Mobile 2';
    if (onServer) await reviseProject('p10', NEW);
    else
      await context.addCookies([
        { name: 'opchub-mock-revision', value: encodeURIComponent(`p10:${NEW}`), url: ADMIN_URL },
      ]);
    await openProjects(page);
    await expect(tab(page, 'Chờ duyệt')).toContainText('3');
    const row = card(page, 'OPC Hub Mobile');
    await expect(row).toContainText('Bản sửa');
    await expect(row).toContainText('Đang hiển thị');
    await row.getByRole('button', { name: 'Xem & duyệt' }).click();
    await expect(drawer(page)).toContainText(NEW);
    await drawer(page).getByRole('button', { name: 'Duyệt & xuất bản' }).click();
    await expect(toast(page)).toHaveText(`Đã duyệt & xuất bản · OPC Hub Mobile`);
    await expect(tab(page, 'Chờ duyệt')).toContainText('2');
    await tab(page, 'Đang hiển thị').click();
    await expect(card(page, NEW)).toBeVisible();
    await expect(card(page, NEW)).not.toContainText('Bản sửa');
  });

  test('yêu cầu chỉnh sửa bằng lời nhắn; ẩn rồi xuất bản lại; nổi bật tuần', async ({ page }) => {
    await openProjects(page);
    await review(page, 'EduMate');
    await drawer(page)
      .getByRole('textbox', { name: 'Lời nhắn gửi chủ dự án' })
      .fill('Thêm số liệu');
    await drawer(page).getByRole('button', { name: 'Yêu cầu chỉnh sửa' }).click();
    await expect(toast(page)).toHaveText('Đã gửi yêu cầu chỉnh sửa · EduMate');
    await expect(tab(page, 'Cần chỉnh sửa')).toContainText('2');

    await tab(page, 'Đang hiển thị').click();
    await review(page, 'SoloBooks');
    await drawer(page).getByRole('switch').click();
    await expect(toast(page)).toHaveText('Đã đặt SoloBooks làm dự án nổi bật tuần');
    await expect(drawer(page).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    await drawer(page).getByRole('button', { name: 'Ẩn dự án' }).click();
    await confirmBox(page).getByRole('button', { name: 'Ẩn' }).click();
    await expect(toast(page)).toHaveText('Đã ẩn · SoloBooks');

    await tab(page, 'Đã ẩn').click();
    await card(page, 'SoloBooks').getByRole('button', { name: 'Xem' }).click();
    await expect(drawer(page).getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    await drawer(page).getByRole('button', { name: 'Xuất bản lại' }).click();
    await expect(toast(page)).toHaveText('Đã duyệt & xuất bản · SoloBooks');
    await expect(tab(page, 'Đã ẩn')).toContainText('1');
  });

  test('chọn nhiều: duyệt & xuất bản, ẩn, xoá (xác nhận)', async ({ page }) => {
    await openProjects(page);
    await page.getByTitle('Dạng danh sách').click();
    await page.getByRole('checkbox', { name: 'Chọn tất cả dự án trên trang' }).click();
    await expect(page.getByText(/Đã chọn\s*2\s*mục/)).toBeVisible();
    await page.getByRole('button', { name: 'Duyệt & xuất bản' }).click();
    await expect(toast(page)).toHaveText('Đã xuất bản 2 dự án');
    await expect(page.getByText('Không còn dự án nào chờ duyệt')).toBeVisible();

    await tab(page, 'Đang hiển thị').click();
    await page.getByRole('checkbox', { name: 'Chọn HalalLink' }).click();
    await page.getByRole('checkbox', { name: 'Chọn EduMate' }).click();
    await page.getByRole('button', { name: 'Ẩn', exact: true }).click();
    await confirmBox(page).getByRole('button', { name: 'Ẩn' }).click();
    await expect(toast(page)).toHaveText('Đã ẩn 2 dự án');
    await expect(tab(page, 'Đã ẩn')).toContainText('3');

    await tab(page, 'Đã ẩn').click();
    await page.getByRole('checkbox', { name: 'Chọn HalalLink' }).click();
    await page.getByRole('button', { name: 'Xóa', exact: true }).first().click();
    await expect(confirmBox(page)).toContainText('1 dự án cùng góp ý sẽ bị xóa vĩnh viễn');
    await confirmBox(page).getByRole('button', { name: 'Hủy' }).click();
    await expect(tab(page, 'Đã ẩn')).toContainText('3');
    await page.getByRole('button', { name: 'Xóa', exact: true }).first().click();
    await confirmBox(page).getByRole('button', { name: 'Xóa' }).click();
    await expect(toast(page)).toHaveText('Đã xóa 1 dự án');
    await expect(tab(page, 'Đã ẩn')).toContainText('2');
  });

  test('xoá một dự án từ thẻ (xác nhận)', async ({ page }) => {
    await openProjects(page);
    await card(page, 'EduMate').getByRole('button', { name: 'Xóa' }).click();
    await expect(confirmBox(page)).toContainText('Xóa dự án?');
    await confirmBox(page).getByRole('button', { name: 'Xóa' }).click();
    await expect(toast(page)).toHaveText('Đã xóa dự án EduMate');
    await expect(card(page, 'EduMate')).toHaveCount(0);
    await expect(tab(page, 'Chờ duyệt')).toContainText('1');
  });
});
