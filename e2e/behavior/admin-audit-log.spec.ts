import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { csvDownload } from './helpers/csv-download';
import { auditLogPageSchema } from '@opchub/shared/api-domains';
import { auditDayRange } from './helpers/audit-filters';

for (const width of [1440, 390]) {
  test(`D-139 audit filters share list and CSV state at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${ADMIN_URL}/login`);
    await page
      .locator('input[autocomplete=username],input[type=email]')
      .fill('admin@opchub.community');
    await page.locator('input[type=password]').fill('Admin@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(/\/overview$/);
    await page.goto(`${ADMIN_URL}/settings?tab=audit-log`);
    await page.getByRole('combobox', { name: 'Nhóm', exact: true }).click();
    const member = page.waitForResponse((r) => {
      const u = new URL(r.url());
      return (
        u.pathname === '/v1/admin/audit-logs' && u.searchParams.get('tag') === 'member' && r.ok()
      );
    });
    await page
      .locator('.ant-select-item-option-content')
      .getByText('Thành viên', { exact: true })
      .click();
    expect(
      auditLogPageSchema.parse(await (await member).json()).items.every((r) => r.tag === 'member'),
    ).toBe(true);
    await page.getByRole('combobox', { name: 'Người thực hiện', exact: true }).click();
    const system = page.waitForResponse((r) => {
      const u = new URL(r.url());
      return (
        u.pathname === '/v1/admin/audit-logs' &&
        u.searchParams.get('actorId') === 'system' &&
        r.ok()
      );
    });
    await page
      .locator('.ant-select-item-option-content')
      .getByText('Hệ thống', { exact: true })
      .click();
    const rows = auditLogPageSchema.parse(await (await system).json()).items;
    expect(rows.every((r) => r.actorName === 'Hệ thống' && r.tag === 'member')).toBe(true);
    const range = await auditDayRange(page);
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get('tag') === 'member' &&
        url.searchParams.get('actorId') === 'system' &&
        url.searchParams.get('from') === range.from,
    );
    await page.reload();
    await expect(
      page.getByRole('combobox', { name: 'Người thực hiện', exact: true }),
    ).toBeVisible();
    const exporting = page.waitForRequest(
      (r) => r.url().endsWith('/admin/audit-logs/export') && r.method() === 'POST',
    );
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất CSV', exact: true }).click();
    expect((await exporting).postDataJSON()).toEqual({
      filters: { tag: 'member', actorId: 'system', ...range },
    });
    expect((await csvDownload(await download)).charCodeAt(0)).toBe(0xfeff);
    await page.getByRole('button', { name: 'Xóa lọc', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Xóa lọc', exact: true })).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

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
  await page.goto(`${ADMIN_URL}/settings?tab=audit-log`);
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
