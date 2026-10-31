import { test, expect } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';

test.use({ affiliateDemo: true });

async function openAffiliate(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/overview$/);
  await page
    .locator('aside')
    .getByRole('link', { name: 'Mạng lưới Affiliate', exact: true })
    .click();
  await expect(page.getByRole('tab', { name: /^Hoa hồng/ })).toBeVisible();
}

test.describe('Affiliate Admin (TIP-V2-404)', () => {
  test('REQ-312 AF0 commissions have real names/amounts; search and reload retain URL state', async ({
    page,
  }) => {
    await openAffiliate(page);
    await page.getByPlaceholder('Tìm thành viên hoặc affiliate...').fill('Do Minh Tuan');
    await expect(page).toHaveURL(/q=Do/);
    // AF0 has three customers with this name, belonging to different agents.
    await expect(page.getByRole('row').filter({ hasText: 'Đỗ Minh Tuấn' })).toHaveCount(3);
    const row = page
      .getByRole('row')
      .filter({ hasText: 'Đỗ Minh Tuấn' })
      .filter({ hasText: 'Nguyễn Văn An' });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Nguyễn Văn An');
    // D-110 / BR-AFF-REV: gói thực trả như prototype v4.2 (Cá nhân 1.200.000đ, DN 3.600.000đ)
    await expect(row).toContainText('3.600.000đ');
    await expect(row).toContainText('720.000đ');
    await page.reload();
    await expect(page.getByPlaceholder('Tìm thành viên hoặc affiliate...')).toHaveValue(
      'Do Minh Tuan',
    );
    await expect(page.getByRole('row').filter({ hasText: 'Đỗ Minh Tuấn' })).toHaveCount(3);
    await expect(row).toContainText('720.000đ');
  });

  test('REQ-312 agent search opens detail with bank, monthly reconciliation and customer history', async ({
    page,
  }) => {
    await openAffiliate(page);
    await page.getByRole('tab', { name: /^Affiliate/ }).click();
    await page.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill('HAOPC');
    const row = page.getByRole('row').filter({ hasText: 'HAOPC' });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('25%');
    await row.getByRole('link', { name: 'Lê Thu Hà', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Lê Thu Hà', exact: true })).toBeVisible();
    await expect(page.getByText('LE THU HA · ACB · 2468 1357', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Đối soát & chi trả theo tháng', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('row').filter({ hasText: '09/2026' })).toHaveCount(1);
    await page.getByRole('tab', { name: 'Khách hàng của đại lý 14', exact: true }).click();
    await expect(page).toHaveURL(/tab=customers/);
    await expect(
      page.getByRole('columnheader', { name: 'Lịch sử chi trả', exact: true }),
    ).toBeVisible();
  });

  test('REQ-308 policy saves through API and remains when switching tabs in the same session', async ({
    page,
  }) => {
    await openAffiliate(page);
    await page.getByRole('tab', { name: 'Chính sách', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'GĐ Vùng năm 1', exact: true }).fill('30');
    await page
      .getByRole('spinbutton', { name: 'Thời gian ghi nhận link (ngày)', exact: true })
      .fill('45');
    // D-91 (2): điều khoản nằm trong hộp thoại "Sửa điều khoản", lưu cùng chính sách
    await page.getByRole('button', { name: 'Sửa điều khoản', exact: true }).click();
    const termsDialog = page.getByRole('dialog', { name: 'Điều khoản chương trình' });
    await termsDialog
      .getByRole('textbox', { name: 'Điều khoản chương trình', exact: true })
      .fill('Điều khoản kiểm thử P4');
    await termsDialog.getByRole('button', { name: 'Xong', exact: true }).click();
    await expect(termsDialog).toBeHidden();
    const response = page.waitForResponse(
      (res) => res.url().endsWith('/admin/affiliate/policy') && res.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect(
      page.getByRole('status').filter({ hasText: 'Đã lưu chính sách affiliate' }),
    ).toBeVisible();
    await page.getByRole('tab', { name: /^Hoa hồng/ }).click();
    await page.getByRole('tab', { name: 'Chính sách', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: 'GĐ Vùng năm 1', exact: true })).toHaveValue(
      '30',
    );
    await expect(
      page.getByRole('spinbutton', { name: 'Thời gian ghi nhận link (ngày)', exact: true }),
    ).toHaveValue('45');
    await page.reload();
    await page.getByRole('button', { name: 'Sửa điều khoản', exact: true }).click();
    await expect(
      termsDialog.getByRole('textbox', { name: 'Điều khoản chương trình', exact: true }),
    ).toHaveValue('Điều khoản kiểm thử P4');
    await termsDialog.getByRole('button', { name: 'Xong', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: 'GĐ Vùng năm 1', exact: true })).toHaveValue(
      '30',
    );
    await page.getByRole('tab', { name: /^Affiliate/ }).click();
    await page.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill('HAOPC');
    await page
      .getByRole('row')
      .filter({ hasText: 'HAOPC' })
      .getByRole('link', { name: 'Lê Thu Hà', exact: true })
      .click();
    await expect(page.getByText(/Ghi nhận link 45 ngày/)).toBeVisible();
  });

  test('REQ-310 bulk cancellation requires a reason and updates both selected commissions', async ({
    page,
  }) => {
    await openAffiliate(page);
    await page.getByPlaceholder('Tìm thành viên hoặc affiliate...').fill('Nguyễn Văn An');
    // Wait for the filtered AF0 dataset, not the previous page retained while loading.
    await expect(page.getByRole('row').filter({ hasText: 'Nguyễn Văn An' })).toHaveCount(9);
    const first = page.getByRole('row').filter({ hasText: 'Đỗ Minh Tuấn' });
    const second = page.getByRole('row').filter({ hasText: 'Đặng Ngọc Ánh' });
    await first.getByRole('checkbox').check();
    await second.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Hủy hoa hồng', exact: true });
    await expect(dialog.getByRole('button', { name: 'Xác nhận', exact: true })).toBeDisabled();
    await dialog.getByLabel('Lý do hủy', { exact: true }).fill('Vi phạm điều khoản E2E');
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Đã hủy 2 khoản hoa hồng' }),
    ).toBeVisible();
    await expect(first.getByLabel('Đã hủy: Vi phạm điều khoản E2E', { exact: true })).toBeVisible();
    await expect(
      second.getByLabel('Đã hủy: Vi phạm điều khoản E2E', { exact: true }),
    ).toBeVisible();
  });
});
