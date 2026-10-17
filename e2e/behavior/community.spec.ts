import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';

/** G2b — P-17 → P-27: Cộng đồng (app mới, MSW) */

const SEARCH = 'Tìm theo tên, chủ đề hoặc mô tả cộng đồng...';

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

const card = (page: Page, name: string) =>
  page.locator('article').filter({ has: page.getByText(name, { exact: true }) });

async function openCommunity(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Cộng đồng', { exact: true }).click();
  await expect(page.getByText('Khám phá cộng đồng')).toBeVisible();
}

test.describe('Cộng đồng', () => {
  test('tìm kiếm có ×, lọc, khu vực + sắp xếp, URL giữ trạng thái', async ({ page }) => {
    await openCommunity(page);
    await expect(page.getByText('Hiển thị 34 / 34 cộng đồng')).toBeVisible();

    await page.getByPlaceholder(SEARCH).fill('Đà Nẵng');
    await expect(page.getByText('Hiển thị 1 / 34 cộng đồng')).toBeVisible();
    await expect(page).toHaveURL(/q=/);
    await page.getByRole('button', { name: 'Xoá từ khoá' }).click();
    await expect(page.getByPlaceholder(SEARCH)).toHaveValue('');

    await page.getByRole('radio', { name: 'Đã tham gia' }).click();
    await expect(page.locator('article')).toHaveCount(3);
    await expect(page).toHaveURL(/filter=joined/);
    await page.getByRole('radio', { name: 'Tất cả' }).click();

    await page.getByRole('button', { name: /^Miền Trung\s*11$/ }).click();
    await page.locator('select').first().selectOption({ label: 'Tên A–Z' });
    await expect(page.getByText('Hiển thị 11 / 34 cộng đồng')).toBeVisible();
    await expect(page.locator('article').first()).toContainText('OPC Đà Nẵng');
    await expect(page).toHaveURL(/region=.*sort=name|sort=name.*region=/);
  });

  test('rỗng → Xoá bộ lọc; phân trang + cỡ trang', async ({ page }) => {
    await openCommunity(page);
    await page.getByPlaceholder(SEARCH).fill('zzzz');
    await expect(page.getByText('Không tìm thấy cộng đồng phù hợp')).toBeVisible();
    await page.getByRole('button', { name: 'Xoá bộ lọc' }).click();
    await expect(page.getByText('Hiển thị 1–9 / 34 cộng đồng')).toBeVisible();

    await page.getByRole('button', { name: 'Trang 2' }).click();
    await expect(page.getByText('Hiển thị 10–18 / 34 cộng đồng')).toBeVisible();
    await page.getByLabel('Số cộng đồng mỗi trang').selectOption('12');
    await expect(page.getByText('Hiển thị 1–12 / 34 cộng đồng')).toBeVisible();
    await expect(page.locator('article')).toHaveCount(12);
  });

  test('tham gia nhóm công khai, rồi rời nhóm', async ({ page }) => {
    await openCommunity(page);
    await card(page, 'OPC Đà Nẵng').getByRole('button', { name: 'Đăng ký tham gia' }).click();
    const dialog = page.getByRole('dialog', { name: 'OPC Đà Nẵng' });
    await expect(dialog).toContainText('(không bắt buộc)');
    await dialog.getByRole('button', { name: 'Tham gia ngay' }).click();
    await expect(toast(page)).toHaveText('Vui lòng đồng ý nội quy cộng đồng');

    await dialog.getByText('Tôi đồng ý tuân thủ nội quy cộng đồng').click();
    await dialog.getByRole('button', { name: 'Tham gia ngay' }).click();
    await expect(toast(page)).toHaveText('Chào mừng bạn đến với OPC Đà Nẵng!');
    await expect(dialog).toBeHidden();
    await expect(card(page, 'OPC Đà Nẵng').getByText('Vào phòng chat')).toBeVisible();
    await expect(page.getByText('đã tham gia', { exact: true }).locator('..')).toContainText('4');

    await card(page, 'OPC Đà Nẵng').getByRole('button', { name: 'Rời nhóm' }).click();
    await expect(toast(page)).toHaveText('Đã rời OPC Đà Nẵng');
    await expect(card(page, 'OPC Đà Nẵng').getByText('Đăng ký tham gia')).toBeVisible();
  });

  test('nhóm cần duyệt: bắt buộc giới thiệu → chờ duyệt → huỷ yêu cầu', async ({ page }) => {
    await openCommunity(page);
    await card(page, 'OPC Hải Phòng').getByRole('button', { name: 'Đăng ký tham gia' }).click();
    const dialog = page.getByRole('dialog', { name: 'OPC Hải Phòng' });
    await expect(dialog).toContainText('(bắt buộc)');
    await dialog.getByText('Tôi đồng ý tuân thủ nội quy cộng đồng').click();
    await dialog.getByRole('button', { name: 'Gửi yêu cầu tham gia' }).click();
    await expect(toast(page)).toHaveText('Nhóm này cần lời giới thiệu để quản trị viên duyệt');

    await dialog
      .getByPlaceholder('Bạn đang làm gì, mong muốn gì khi tham gia nhóm...')
      .fill('Founder freelance');
    await dialog.getByRole('button', { name: 'Gửi yêu cầu tham gia' }).click();
    await expect(toast(page)).toHaveText('Đã gửi yêu cầu – chủ nhóm sẽ xem xét và duyệt');
    const hp = card(page, 'OPC Hải Phòng');
    await expect(hp.getByText('Đang chờ duyệt')).toBeVisible();

    await hp.getByRole('button', { name: 'Huỷ yêu cầu' }).click();
    await expect(toast(page)).toHaveText('Đã huỷ yêu cầu');
    await expect(hp.getByText('Đăng ký tham gia')).toBeVisible();
  });

  test('Esc / Huỷ đóng popup', async ({ page }) => {
    await openCommunity(page);
    await card(page, 'OPC Đà Nẵng').getByRole('button', { name: 'Đăng ký tham gia' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await card(page, 'OPC Đà Nẵng').getByRole('button', { name: 'Đăng ký tham gia' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Huỷ' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
