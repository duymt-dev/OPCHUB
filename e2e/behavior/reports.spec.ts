import { readFile } from 'node:fs/promises';
import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { onServer } from '../server/api';
import { ADMIN_URL } from '../urls';

/**
 * TIP-V4-614 (D-78, REQ-516): Admin › Báo cáo — chọn mẫu B1/B2/B3, tháng, phạm vi; xem trước số
 * liệu; "Xuất CSV" tải file đúng khuôn mẫu. Chạy trên MSW (số liệu mock tất định); bản server:
 * test:int `test/reporting/report-export`.
 */

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function openReports(page: Page, email = 'admin@opchub.community') {
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Báo cáo', { exact: true }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole('heading', { name: 'Báo cáo', exact: true })).toBeVisible();
}

/** AntD Select: mở ô rồi bấm mục trong danh sách thả xuống đang hiện (listbox ARIA chỉ là bản ẩn) */
const pick = async (page: Page, label: string, option: string) => {
  await page.getByLabel(label, { exact: true }).click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: new RegExp(`^${option}$`) })
    .click();
};

test.describe('Admin › Báo cáo B1 / B2 / B3 (V4-614)', () => {
  test.skip(onServer, 'Số liệu mock MSW; bản server: test:int reporting/report-export');

  test('B1 mặc định: tháng trước, nhóm đầu; thẻ số liệu + bảng chỉ số, ô chưa có dữ liệu "—"', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openReports(page);
    await expect(
      page.getByText('Tổng hợp số liệu tháng và xuất CSV theo mẫu B1 / B2 / B3'),
    ).toBeVisible();
    // Kho mock "bây giờ" 16/10/2026 → mặc định tháng 09/2026
    await expect(page.getByLabel('Tháng', { exact: true }).locator('..')).toContainText(
      'Tháng 09/2026',
    );
    await expect(page.locator('[data-kpi]')).toHaveCount(4);
    const table = page.getByRole('region', { name: 'Chỉ số tháng' });
    await expect(table.locator('[data-metric]')).toHaveCount(7);
    await expect(table.locator('[data-metric="partners"]')).toContainText('—');
    await table
      .locator('[data-metric="partners"] [aria-label="Chưa có dữ liệu trên hệ thống"]')
      .hover();
    await expect(page.getByRole('tooltip')).toHaveText('Chưa có dữ liệu trên hệ thống');
  });

  test('B2 Hà Nội: bảng Nhóm ngành; B3 Miền Bắc: KPI theo tỉnh + Tổng vùng', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openReports(page);
    await page.getByText('B2 · Tỉnh', { exact: true }).click();
    await pick(page, 'Tỉnh / thành', 'Hà Nội');
    const groups = page.getByRole('region', { name: 'Nhóm ngành' });
    await expect(groups.locator('tbody tr')).toHaveCount(1);
    await expect(groups.locator('tbody tr').first()).toContainText('OPC Hà Nội');

    await page.getByText('B3 · Vùng', { exact: true }).click();
    const provinces = page.getByRole('region', { name: 'KPI theo tỉnh' });
    await expect(provinces.locator('[data-row="total"]')).toContainText('Tổng vùng');
    await expect(provinces.locator('tbody tr')).not.toHaveCount(1);
    await expect(provinces).toContainText('Hà Nội');
  });

  test('Xuất CSV B1 → tải file đúng tên + khuôn (BOM, 17 dòng, ngoặc kép), toast "Đã xuất"', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openReports(page);
    await pick(page, 'Nhóm', 'OPC Hà Nội · Hà Nội');
    await expect(page.locator('[data-kpi]').first()).not.toContainText('—');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất CSV' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('Bao-cao-B1-2026-09-OPC-Ha-Noi.csv');
    const bytes = await readFile(await file.path());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = bytes.subarray(3).toString('utf8').split('\n');
    expect(lines).toHaveLength(17);
    expect(lines[0]).toBe('"MẪU B1 – BÁO CÁO THÁNG NHÓM NGÀNH","","",""');
    expect(lines[1]).toBe('"Tỉnh/Thành","Hà Nội","Tháng/Năm","09/2026"');
    await expect(
      toast(page).filter({ hasText: 'Đã xuất Bao-cao-B1-2026-09-OPC-Ha-Noi.csv' }),
    ).toBeVisible();
  });

  test('Giảng viên không có reports.view: mục ẩn, mở URL → 403', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await page.locator('input[type=email]').fill('yen.do@opchub.community');
    await page.locator('input[type=password]').fill('Admin@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await expect(page.locator('aside').getByText('Báo cáo', { exact: true })).toHaveCount(0);
    await page.goto(`${ADMIN_URL}/reports`);
    await expect(page.getByText('Bạn không có quyền xem mục này')).toBeVisible();
  });

  test('390px: thanh lọc xuống dòng, không tràn ngang', async ({ page }) => {
    await openReports(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: 'Xuất CSV' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
