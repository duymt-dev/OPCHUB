import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

for (const width of [360, 390]) {
  test(`REQ-310 REQ-312 commission menus fit ${width}px and never restore or directly pay terminal rows`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    const search = page.getByPlaceholder('Tìm thành viên hoặc affiliate...');
    await search.fill('Nguyễn Văn An');
    const rows = page.locator('tbody tr[data-row-key]');
    await expect(rows).toHaveCount(9);
    const paid = rows.filter({ hasText: 'Đinh Thị Mai' });
    await expect(paid).toContainText('Đã chi trả');
    let writes = 0;
    page.on('request', (request) => {
      if (request.method() !== 'GET' && /\/v1\/admin\/affiliates?(?:\/|\?|$)/.test(request.url()))
        writes++;
    });
    const menu = page.getByRole('menu');
    const paidMenu = paid.getByRole('button', { name: 'Chuyển trạng thái', exact: true });
    await paidMenu.focus();
    await paidMenu.press('Enter');
    await expect(menu.getByRole('menuitem')).toHaveCount(3);
    for (const label of ['Đã ghi nhận', 'Hủy hoa hồng', 'Đã chi trả'])
      await expect(menu.getByRole('menuitem', { name: label, exact: true })).toBeDisabled();
    await expect(menu).toBeVisible();
    await expect(menu.locator('..')).toHaveCSS('opacity', '1');
    await expect.poll(async () => (await menu.boundingBox())?.width ?? 0).toBeCloseTo(180, 0);
    const bounds = await menu.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) throw new Error('Status menu must be visible');
    expect(bounds.width).toBeCloseTo(180, 0);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await page.getByRole('heading', { name: 'Affiliate', exact: true }).click();
    await expect(menu).toBeHidden();

    const recorded = rows.filter({ hasText: 'Đỗ Minh Tuấn' });
    await expect(recorded).toContainText('Đã ghi nhận');
    await recorded.getByRole('button', { name: 'Chuyển trạng thái', exact: true }).click();
    await expect(menu.getByRole('menuitem', { name: 'Đã ghi nhận', exact: true })).toBeDisabled();
    await expect(menu.getByRole('menuitem', { name: 'Đã chi trả', exact: true })).toBeDisabled();
    await menu.getByRole('menuitem', { name: 'Hủy hoa hồng', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Hủy hoa hồng', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Xác nhận', exact: true })).toBeDisabled();
    await dialog.getByText('Đóng', { exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(recorded).toContainText('Đã ghi nhận');
    expect(writes).toBe(0);

    await search.fill('');
    await expect(page).not.toHaveURL(/[?&]q=/);
    const cancelledFilter = page.getByRole('radio', { name: /^Đã hủy/ });
    await page.locator('label').filter({ has: cancelledFilter }).click();
    await expect(cancelledFilter).toBeChecked();
    const cancelled = rows.first();
    await expect(cancelled).toContainText('Đã hủy');
    await cancelled.getByRole('button', { name: 'Chuyển trạng thái', exact: true }).click();
    for (const label of ['Đã ghi nhận', 'Đã hủy', 'Đã chi trả'])
      await expect(menu.getByRole('menuitem', { name: label, exact: true })).toBeDisabled();
    expect(writes).toBe(0);
    await page.reload();
    await expect(cancelledFilter).toBeChecked();
    await expect(cancelled).toContainText('Đã hủy');
    expect(writes).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
