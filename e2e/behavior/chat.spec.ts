import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PORTAL_URL } from '../urls';

/** G2c — Chat nhóm P-28 → P-48 trên app mới (MSW) */

const MSG = 'Chào cả nhà, tuần này ai đi Meetup #12 không? Mình đang gom nhóm đi chung.';

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function openChat(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Chat nhóm', { exact: true }).click();
  await expect(page.getByText('Enter để gửi')).toBeVisible();
}

const composer = (page: Page) => page.getByPlaceholder(/^Nhắn tin trong #/);

test.describe('Chat nhóm', () => {
  test('đổi chủ đề, đổi nhóm, URL theo phòng', async ({ page }) => {
    await openChat(page);
    await expect(page).toHaveURL(/\/chat$/);
    await page.getByText('Hỏi đáp thuế & pháp lý', { exact: true }).click();
    await expect(page).toHaveURL(/\/chat\/c1\/qa/);
    await expect(composer(page)).toHaveAttribute(
      'placeholder',
      'Nhắn tin trong #Hỏi đáp thuế & pháp lý...',
    );
    await page.locator('[title="OPC TP. Hồ Chí Minh"]').click();
    await expect(page).toHaveURL(/\/chat\/c2/);
    await expect(page.getByText('Workflow của mình đây', { exact: false }).last()).toBeVisible();
  });

  test('tạo chủ đề → phòng trống; trùng tên báo lỗi; xoá chủ đề của mình', async ({ page }) => {
    await openChat(page);
    await page.locator('[title="Tạo chủ đề mới"]').click();
    await page.getByPlaceholder('Tên chủ đề, VD: Tìm đối tác in ấn').fill('Test');
    await page.getByRole('button', { name: 'Tạo', exact: true }).click();
    await expect(page.getByText('Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!')).toBeVisible();
    await expect(page.getByText('Chào mừng đến #Test')).toBeVisible();

    await page.locator('[title="Tạo chủ đề mới"]').click();
    await page.getByPlaceholder('Tên chủ đề, VD: Tìm đối tác in ấn').fill('chung');
    await page.getByRole('button', { name: 'Tạo', exact: true }).click();
    await expect(toast(page)).toHaveText('Chủ đề này đã có trong nhóm');

    await page.locator('[title="Xoá chủ đề của bạn"]').click();
    await expect(toast(page)).toHaveText('Đã xoá chủ đề Test');
    await expect(page.getByText('Chào mừng đến #Chung')).toBeVisible();
  });

  test('gửi chữ / file / ảnh, nhắc tên có gợi ý', async ({ page }) => {
    await openChat(page);
    await composer(page).fill('Xin chào');
    await composer(page).press('Enter');
    await expect(page.getByText('Xin chào', { exact: true })).toBeVisible();
    await page.locator('[title="Đính kèm file"]').click();
    await expect(page.getByText('Ke-hoach-Q4.pdf').first()).toBeVisible();
    await page.locator('[title="Gửi ảnh"]').click();
    await expect(page.getByText('anh-tai-len.jpg')).toBeVisible();

    await page.locator('[title="Nhắc tên"]').click();
    await expect(page.getByText('Nhắc tên thành viên')).toBeVisible();
    await page.getByRole('button', { name: /^Lê Minh Anh CEO/ }).click();
    await expect(composer(page)).toHaveValue('@Lê Minh Anh ');
    await composer(page).press('Enter');
    await expect(toast(page)).toHaveText('Đã nhắc Lê Minh Anh');
  });

  test('chọn tin: cảm xúc, trả lời, ghim / bỏ ghim', async ({ page }) => {
    await openChat(page);
    const msg = page.getByText(MSG, { exact: true }).last();
    await msg.click();
    await page.getByRole('button', { name: '😮' }).click();
    await expect(page.getByRole('button', { name: '😮 1' })).toBeVisible();

    await msg.click();
    await page.getByRole('button', { name: 'Trả lời', exact: true }).click();
    await expect(page.getByText('Trả lời Lê Minh Anh')).toBeVisible();
    await composer(page).fill('Mình đi nhé');
    await composer(page).press('Enter');
    await expect(page.getByText('Trả lời Lê Minh Anh')).toHaveCount(0);
    await expect(page.getByText('Mình đi nhé', { exact: true })).toBeVisible();

    await page.getByText(/^1 tin đã ghim/).click();
    await page.getByRole('button', { name: 'Bỏ ghim' }).first().click();
    await expect(toast(page)).toHaveText('Đã bỏ ghim');
    await expect(page.getByText(/tin đã ghim/)).toHaveCount(0);
  });

  test('tìm trong phòng ghi ?q=, đếm kết quả, Đóng', async ({ page }) => {
    await openChat(page);
    await page.locator('[title="Tìm trong phòng"]').click();
    await page.getByPlaceholder('Tìm tin nhắn trong phòng này...').fill('Meetup');
    await expect(page).toHaveURL(/q=Meetup/);
    await expect(page.getByText('1 kết quả')).toBeVisible();
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await expect(page).not.toHaveURL(/q=/);
  });

  test('bảng thông tin: duyệt yêu cầu, tab File / Đã ghim', async ({ page }) => {
    await openChat(page);
    await expect(page.getByText('Bạn là chủ nhóm')).toBeVisible();
    const card = page
      .locator('div')
      .filter({ hasText: 'Nguyễn Thị Hồng' })
      .filter({
        has: page.getByRole('button', { name: 'Duyệt' }),
      });
    await card.last().getByRole('button', { name: 'Duyệt' }).click();
    await expect(toast(page)).toHaveText('Đã duyệt Nguyễn Thị Hồng vào OPC Hà Nội');
    await expect(page.getByRole('button', { name: 'Từ chối' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Từ chối' }).click();
    await expect(toast(page)).toHaveText('Đã từ chối Đặng Văn Khoa vào OPC Hà Nội');
    await expect(page.getByText('Không có yêu cầu nào đang chờ.')).toBeVisible();

    await page.getByRole('tab', { name: 'File' }).click();
    await expect(page).toHaveURL(/panel=files/);
    await expect(page.getByText('Mau-hop-dong-OPC.docx').last()).toBeVisible();
    await page.getByRole('tab', { name: 'Đã ghim (1)' }).click();
    await expect(page.getByRole('tabpanel').getByText('Lê Minh Anh')).toBeVisible();
    await page.locator('[title="Ẩn bảng thông tin"]').click();
    await expect(page.getByRole('tablist')).toHaveCount(0);
  });

  test('báo cáo tin: bắt chọn lý do, gửi xong gắn nhãn', async ({ page }) => {
    await openChat(page);
    await page.getByText(MSG, { exact: true }).last().click();
    await page.getByRole('button', { name: 'Báo cáo', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Báo cáo tin nhắn' });
    await dialog.getByRole('button', { name: 'Gửi báo cáo' }).click();
    await expect(toast(page)).toHaveText('Vui lòng chọn lý do');
    await dialog.getByRole('radio', { name: 'Lừa đảo' }).click();
    await dialog.getByRole('button', { name: 'Gửi báo cáo' }).click();
    await expect(toast(page)).toHaveText('Đã gửi báo cáo tới quản trị viên');
    await expect(page.getByText('Bạn đã báo cáo tin này')).toBeVisible();
  });

  test('xem trước nhóm chưa tham gia → tham gia nhóm mở', async ({ page }) => {
    await openChat(page);
    await page.locator('[title="OPC Đà Nẵng"]').click();
    await expect(page.getByText(/Bạn chưa là thành viên của nhóm này/)).toBeVisible();
    await page.getByRole('button', { name: 'Để sau' }).click();
    await expect(page.getByText(/Bạn chưa là thành viên/)).toHaveCount(0);
    await page.locator('[title="OPC Đà Nẵng"]').click();
    await page.getByRole('button', { name: 'Tham gia nhóm' }).click();
    await expect(toast(page)).toHaveText('Đã tham gia OPC Đà Nẵng');
    await expect(page).toHaveURL(/\/chat\/c3/);
    await expect(page.getByText('Chào mừng đến #Chung')).toBeVisible();
  });

  test('+ Tham gia thêm nhóm → /community', async ({ page }) => {
    await openChat(page);
    await page.locator('[title="Tham gia thêm nhóm"]').click();
    await expect(page).toHaveURL(/\/community$/);
  });

  test('chưa tham gia nhóm nào → chỉ thành viên mới xem được', async ({ page }) => {
    await openChat(page);
    await page.locator('aside').getByText('Dashboard', { exact: true }).click();
    await page.evaluate(async () => {
      for (const g of ['c1', 'c2', 'c6']) await fetch(`/v1/groups/${g}/join`, { method: 'DELETE' });
    });
    await page.locator('aside').getByText('Chat nhóm', { exact: true }).click();
    await expect(page.getByText('Chỉ thành viên nhóm mới xem và gửi được tin nhắn.')).toBeVisible();
    await expect(page.getByText(/^Bạn chưa tham gia nhóm nào/)).toBeVisible();
    await expect(page.getByText('34 nhóm')).toBeVisible();
  });
});
