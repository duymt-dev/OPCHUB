import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { csvDownload } from './helpers/csv-download';

test('REQ-624 BR-485 audit tab has90-day copy, CSV below heading, async job and BOM file', async ({
  page,
}) => {
  await page.goto(`${ADMIN_URL}/login`);
  await page
    .locator('input[autocomplete=username],input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await page.goto(`${ADMIN_URL}/settings?tab=log`);
  const heading = page.getByText('Nhật ký hoạt động quản trị', { exact: true });
  await expect(heading).toBeVisible();
  await expect(
    page.getByText(
      'Tự động ghi mọi thao tác của quản trị viên (khóa, duyệt, chi trả, đổi cấu hình…) trong 90 ngày.',
      { exact: true },
    ),
  ).toBeVisible();
  const button = page.getByRole('button', { name: 'Xuất CSV', exact: true });
  await expect(button).toBeEnabled();
  const h = await heading.boundingBox(),
    b = await button.boundingBox();
  expect(h).not.toBeNull();
  expect(b).not.toBeNull();
  expect(b?.y ?? 0).toBeGreaterThan(h?.y ?? 0);
  const request = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/v1/admin/audit-logs/export' &&
      r.request().method() === 'POST',
  );
  const download = page.waitForEvent('download');
  await button.click();
  expect((await request).status()).toBe(202);
  const file = await download;
  expect(file.suggestedFilename()).toBe('nhat-ky-hoat-dong.csv');
  const csv = await csvDownload(file);
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv.slice(1).split('\n')[0]).toBe('Người thực hiện,Thao tác,Nhóm,Thời gian');
  expect(csv).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
});
