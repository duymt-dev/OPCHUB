import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { login as memberLogin } from './project-helpers';
import { PORTAL_URL } from '../urls';

/** G5b — D-51 → D-57: Admin "Dự án" · Kiểm duyệt dự án (app mới, MSW) */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Xem & duyệt dự án' });
const confirmBox = (page: Page) => page.getByRole('alertdialog');
const tab = (page: Page, label: string) => page.getByRole('tab', { name: new RegExp(`^${label}`) });
const card = (page: Page, name: string) => page.locator('article').filter({ hasText: name });

async function openProjects(page: Page, pending = true) {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Dự án OPC', { exact: true }).click();
  await expect(page.getByText('Kiểm duyệt dự án')).toBeVisible();
  // D-89 (v4): tab mặc định "Đang hiển thị"; phần lớn ca bắt đầu ở hàng chờ duyệt
  if (pending) await tab(page, 'Chờ duyệt').click();
}

async function review(page: Page, name: string) {
  await card(page, name).getByRole('button').first().click();
  await expect(drawer(page)).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/p\d+\/review/);
}

test.describe('Admin · Kiểm duyệt dự án', () => {
  test('tab, kiểu xem, trống — trạng thái trên URL', async ({ page }) => {
    await openProjects(page, false);
    // D-89 (v4): "Đang hiển thị" là tab đầu và mặc định (11 dự án, 10 / trang)
    await expect(tab(page, 'Đang hiển thị')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Hiển thị 1–10 / 11 dự án')).toBeVisible();
    await expect(tab(page, 'Chờ duyệt')).toContainText('2');
    await tab(page, 'Chờ duyệt').click();
    await expect(page).toHaveURL(/tab=pending/);
    await expect(page.getByText('Hiển thị 1–2 / 2 dự án')).toBeVisible();
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
    await expect(tab(page, 'Đang hiển thị')).toContainText('12');

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

  test('REQ-612 D-108 sửa công khai ngay, Admin hậu kiểm không nhận bản sửa chờ duyệt', async ({
    page,
    context,
  }) => {
    const owner = await context.newPage();
    await memberLogin(owner);
    await owner.goto(`${PORTAL_URL}/projects/mine`);
    await owner
      .locator('[role=link]')
      .filter({ hasText: 'OPC Hub Mobile' })
      .getByRole('button', { name: 'Chỉnh sửa' })
      .click();
    const edit = owner.getByRole('dialog', { name: 'Chỉnh sửa dự án' });
    await edit.getByPlaceholder('VD: SoloBooks – Kế toán cho OPC').fill('OPC Hub Mobile 2');
    await edit.getByRole('button', { name: 'Gửi đăng dự án' }).click();
    await expect(toast(owner)).toHaveText('Đã đăng dự án – dự án hiển thị ngay trong cộng đồng');
    await openProjects(page, false);
    await page.getByLabel('Số dự án mỗi trang').selectOption('24');
    await expect(card(page, 'OPC Hub Mobile 2')).toBeVisible();
    await expect(card(page, 'OPC Hub Mobile 2')).not.toContainText('Bản sửa');
    await tab(page, 'Chờ duyệt').click();
    await expect(tab(page, 'Chờ duyệt')).toContainText('2');
    await expect(card(page, 'OPC Hub Mobile 2')).toHaveCount(0);
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
