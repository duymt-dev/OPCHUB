import { test, expect, type Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { bankSimulateResultSchema } from '@opchub/shared/api-domains';
import { csvDownload } from './helpers/csv-download';

async function open(page: Page, email = 'admin@opchub.community') {
  await page.goto(`${ADMIN_URL}/login`);
  await page.locator('input[autocomplete=username],input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto(`${ADMIN_URL}/settings?tab=bank`);
}
const region = (page: Page) =>
  page.getByRole('region', { name: 'Đối soát chuyển khoản ngân hàng', exact: true });
const patchResponse = (page: Page) =>
  page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/v1/admin/settings/bank' && r.request().method() === 'PATCH',
  );

test('REQ-621 D-135 providers read-only, OPCHUB syntax, immediate toggle persists and mobile contains table', async ({
  page,
}) => {
  await open(page);
  const panel = region(page);
  for (const name of [/Casso/, /^SePay$/, /Vietcombank API/]) {
    const b = panel.getByRole('button', { name });
    await expect(b).toHaveAttribute('aria-disabled', 'true');
  }
  await expect(panel.getByRole('button', { name: 'Giả lập (dev)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(panel.getByText('Chưa hỗ trợ', { exact: true })).toHaveCount(2);
  await expect(panel.getByText('OPCHUB <Mã TV> <SĐT>', { exact: true })).toBeVisible();
  const saved = patchResponse(page);
  await panel.getByRole('switch', { name: 'Tự kích hoạt khi khớp' }).click();
  expect((await saved).status()).toBe(200);
  await page.reload();
  await expect(panel.getByRole('switch', { name: 'Tự kích hoạt khi khớp' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const account = await panel.getByText('Tài khoản nhận', { exact: true }).boundingBox();
  const owner = await panel.getByText('Chủ tài khoản', { exact: true }).boundingBox();
  expect(account).not.toBeNull();
  expect(owner).not.toBeNull();
  expect(owner?.x).toBe(account?.x);
  expect(owner?.y ?? 0).toBeGreaterThan(account?.y ?? 0);
  await expect(panel.getByRole('region', { name: 'Giao dịch gần đây', exact: true })).toBeVisible();
});

test('REQ-621 BR-484 key rotation confirms no grace, displayed once and masked after close/reload', async ({
  page,
}) => {
  await open(page);
  const panel = region(page);
  await panel.getByRole('button', { name: 'Tạo lại', exact: true }).click();
  const confirm = page.getByRole('dialog');
  await expect(confirm).toContainText('Khóa cũ ngừng hoạt động ngay');
  await confirm.getByRole('button', { name: 'Xác nhận tạo lại', exact: true }).click();
  const once = page.getByRole('dialog', { name: 'Sao chép khóa mới' });
  const key = await once.getByLabel('Sao chép khóa mới', { exact: true }).inputValue();
  expect(key.length).toBeGreaterThanOrEqual(32);
  await once.getByRole('button', { name: 'Đóng', exact: true }).last().click();
  await expect(page.locator('#bank-new-key')).toHaveCount(0);
  await page.reload();
  await expect(panel.getByLabel('Khóa bí mật', { exact: true })).toHaveValue(
    `sk_live_••••••••••••${key.slice(-4)}`,
  );
  await expect(page.locator('#bank-new-key')).toHaveCount(0);
});

test('REQ-621 simulate and connection; off waits, enabling does not replay, on activates new transaction', async ({
  page,
}) => {
  await open(page);
  const panel = region(page);
  await panel.getByRole('button', { name: 'Kiểm tra kết nối' }).click();
  await expect(page.getByRole('status')).toContainText('Đã kết nối Giả lập (dev)');
  const saved = patchResponse(page);
  await panel.getByRole('switch', { name: 'Tự kích hoạt khi khớp' }).click();
  await saved;
  const simulated = page.waitForResponse(
    (r) => r.url().endsWith('/admin/settings/bank/simulate') && r.request().method() === 'POST',
  );
  await panel.getByRole('button', { name: 'Mô phỏng giao dịch đến' }).click();
  const waiting = bankSimulateResultSchema.parse(await (await simulated).json());
  expect(waiting.autoActivated).toBe(false);
  await expect(page.getByRole('status')).toContainText('chờ Admin xác nhận');
  const pending = panel
    .getByRole('row')
    .filter({ hasText: 'Chờ Admin xác nhận (tự kích hoạt tắt)' });
  await expect(pending).toContainText('Không khớp nội dung');
  const enabled = patchResponse(page);
  await panel.getByRole('switch', { name: 'Tự kích hoạt khi khớp' }).click();
  await enabled;
  await expect(pending).toContainText('Không khớp nội dung');
  await panel.getByRole('button', { name: 'Mô phỏng giao dịch đến' }).click();
  await expect(page.getByRole('status')).toContainText('tự kích hoạt Gói Cá nhân');
  await expect(pending).toContainText('Không khớp nội dung');
});

test('REQ-621 TC-482 assign unmatched through existing manual match dialog', async ({ page }) => {
  await open(page);
  const row = region(page).getByRole('row').filter({ hasText: 'chuyen tien phi thanh vien' });
  await row.getByRole('button', { name: 'Gán cho thành viên' }).click();
  const dialog = page.getByRole('dialog', { name: 'Khớp tay giao dịch' });
  await dialog.getByPlaceholder('Tìm tên, email hoặc Mã TV...').fill('Ngô Thành Đạt');
  await dialog.getByRole('button', { name: /Ngô Thành Đạt/ }).click();
  await dialog.getByLabel('Lý do', { exact: true }).fill('Đã đối chiếu sao kê');
  await dialog.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  const matched = page.waitForResponse(
    (r) =>
      /\/admin\/fees\/transactions\/[^/]+\/match$/.test(new URL(r.url()).pathname) &&
      r.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Khớp giao dịch', exact: true }).click();
  expect((await matched).status()).toBe(204);
  await expect(row).toContainText('Gán thủ công');
  await expect(row).toContainText('Ngô Thành Đạt');
});

test('REQ-621 short note required, recorded status, CSV download', async ({ page }) => {
  await open(page);
  const panel = region(page),
    row = panel.getByRole('row').filter({ hasText: 'TV000005' });
  await row.getByRole('button', { name: 'Ghi nhận thiếu', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Ghi nhận thiếu' });
  const submit = dialog.getByRole('button', { name: 'Ghi nhận thiếu', exact: true });
  await expect(submit).toBeDisabled();
  await dialog
    .getByLabel('Ghi chú (bắt buộc, tối đa 500 ký tự)')
    .fill('Đã liên hệ, không kích hoạt');
  await submit.click();
  await expect(row).toContainText('Thiếu tiền · đã ghi nhận');
  await expect(panel.getByText('2 / 1', { exact: true })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Ghi nhận thiếu' })).toHaveCount(0);
  const download = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Xuất CSV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('doi-soat-ngan-hang.csv');
  expect((await csvDownload(file)).charCodeAt(0)).toBe(0xfeff);
});

test('REQ-621 D-135 lecturer cannot see bank settings tab', async ({ page }) => {
  await open(page, 'yen.do@opchub.community');
  await expect(
    page
      .getByRole('navigation', { name: 'Mục cài đặt' })
      .getByRole('button', { name: /Đối soát ngân hàng/ }),
  ).toHaveCount(0);
  await expect(region(page)).toHaveCount(0);
});
