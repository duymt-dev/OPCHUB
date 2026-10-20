import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { test, expect } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';

test.use({ affiliateDemo: true });

async function openAffiliate(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/overview$/);
  await page.locator('aside').getByRole('link', { name: 'Affiliate', exact: true }).click();
  await expect(page.getByRole('tab', { name: /^Hoa hồng/ })).toBeVisible();
}

test('REQ-308 bulk rate applies to both selected agents and recorded commissions, not paid history', async ({
  page,
}) => {
  await openAffiliate(page);
  await page.getByRole('tab', { name: /^Affiliate/ }).click();
  const search = page.getByPlaceholder('Tìm tên, mã giới thiệu, email...');
  await search.fill('OPC');
  await page.getByRole('combobox', { name: 'Số dòng mỗi trang' }).selectOption('100');
  await expect(page).toHaveURL(/size=100/);
  const ha = page.getByRole('row').filter({ hasText: 'HAOPC' });
  await expect(ha).toHaveCount(1);
  // Selection is page-local: both agents must be on the displayed filtered page.
  const khoa = page.getByRole('row').filter({ hasText: 'KHOAOPC' });
  await expect(khoa).toHaveCount(1);
  await ha.getByRole('checkbox').check();
  await khoa.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Đặt %', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Đặt tỷ lệ hoa hồng', exact: true });
  await dialog.getByRole('spinbutton', { name: 'Tỷ lệ hoa hồng (%)', exact: true }).fill('30');
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/admin/affiliates/rate') && r.request().method() === 'PUT',
  );
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(
    page.getByRole('status').filter({ hasText: 'Đã đặt tỷ lệ 30% cho 2 affiliate' }),
  ).toBeVisible();
  await expect(ha).toContainText('30%');
  await expect(khoa).toContainText('30%');
  await ha.getByRole('link', { name: 'Lê Thu Hà', exact: true }).click();
  await page.getByRole('tab', { name: 'Khách hàng của đại lý 14', exact: true }).click();
  const recorded = page.getByRole('row').filter({ hasText: 'Kiều Văn Sơn' });
  await expect(recorded).toContainText('30%');
  await expect(recorded).toContainText('180.000đ');
  const paid = page.getByRole('row').filter({ hasText: 'Đặng Ngọc Ánh' });
  await expect(paid).toContainText('Đã chi trả');
  await expect(paid).toContainText('25%');
  await expect(paid).toContainText('150.000đ');
  await expect(paid).toContainText('LE THU HA · ACB');
  const cancelled = page.getByRole('row').filter({ hasText: 'Đỗ Minh Tuấn' });
  await expect(cancelled).toContainText('25%');
  await expect(cancelled).toContainText('150.000đ');
  await expect(cancelled).toContainText('Hoa hồng đã hủy — không chi trả.');
});

test('REQ-312 pagination changes URL and page size survives reload', async ({ page }) => {
  await openAffiliate(page);
  await page.getByRole('button', { name: 'Trang 2', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole('combobox', { name: 'Số dòng mỗi trang' }).selectOption('20');
  await expect(page).toHaveURL(/size=20/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.getByRole('button', { name: 'Trang 1', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Số dòng mỗi trang' })).toHaveValue('20');
  await expect(page).toHaveURL(/size=20/);
});

test('REQ-312 REQ-410 CSV contains only selected commissions and writes an audit row', async ({
  page,
}) => {
  await openAffiliate(page);
  await page.getByPlaceholder('Tìm thành viên hoặc affiliate...').fill('Nguyễn Văn An');
  await expect(page.getByRole('row').filter({ hasText: 'Nguyễn Văn An' })).toHaveCount(9);
  const first = page.getByRole('row').filter({ hasText: 'Đỗ Minh Tuấn' });
  const second = page.getByRole('row').filter({ hasText: 'Đặng Ngọc Ánh' });
  await first.getByRole('checkbox').check();
  await second.getByRole('checkbox').check();
  const started = Date.now();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất CSV', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('hoa-hong-affiliate.csv');
  const path = await download.path();
  expect(path).not.toBeNull();
  const content = await readFile(path, 'utf8');
  expect(content.charCodeAt(0)).toBe(0xfeff);
  const lines = content.trimEnd().split(/\r?\n/);
  expect(lines).toHaveLength(3);
  expect(lines[0]).toContain('Thành viên mới,Affiliate,Mã,Doanh thu,Tỷ lệ (%),Hoa hồng');
  expect(content).toContain('"Đỗ Minh Tuấn"');
  expect(content).toContain('"Đặng Ngọc Ánh"');
  expect(content).toContain('"OPCAN26"');
  for (const line of lines.slice(1)) expect(line).toContain('"600000","20","120000"');
  await page.locator('aside').getByText('Cài đặt & Phân quyền', { exact: true }).click();
  const audit = page.waitForResponse((r) => r.url().endsWith('/admin/audit-logs') && r.ok());
  await page
    .getByRole('navigation', { name: 'Mục cài đặt' })
    .getByRole('button', { name: /Nhật ký hoạt động/ })
    .click();
  // Append-only native audit survives seed resets: require a newly timestamped row,
  // not a historical matching export from another run.
  const data = z
    .object({ items: z.array(z.object({ summary: z.string(), at: z.iso.datetime() })) })
    .parse(await (await audit).json());
  expect(data.items[0]?.summary).toBe('Xuất CSV 2 dòng commissions');
  expect(Date.parse(data.items[0]?.at ?? '')).toBeGreaterThanOrEqual(started);
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Xuất CSV 2 dòng commissions' }).first(),
  ).toBeVisible();
});
