import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { openAffiliateDetail, signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

for (const width of [360, 390]) {
  test(`REQ-312 customer tab and complete pager fit at ${width}px; page size survives F5`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await openAffiliateDetail(page, 'HAOPC', 'Lê Thu Hà');
    const customers = page.getByRole('tab', { name: 'Khách hàng của đại lý 14', exact: true });
    await customers.click();
    await expect(customers).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('columnheader', { name: '% HH', exact: true })).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: 'Lý Quang Vinh' });
    await expect(row).toContainText('15/10/2026');
    // D-110 / BR-AFF-REV: gói thực trả như prototype v4.2 (Cá nhân 1.200.000đ, DN 3.600.000đ)
    await expect(row).toContainText('300.000đ');
    // v4.6 keeps all six columns in a horizontally scrollable table, not a mobile grid.
    await expect(page.getByRole('columnheader')).toHaveCount(6);
    const table = page.getByRole('table');
    await expect(table).toHaveCSS('min-width', '880px');
    const content = page.locator('.ant-table-content');
    expect(await content.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    const head = page.getByRole('row').filter({ has: page.getByRole('columnheader') });
    const headBox = (await head.boundingBox())!;
    expect(headBox.height).toBe(40);
    const first = page
      .getByRole('row')
      .filter({ hasText: /\d+\/\d+\/\d{4}/ })
      .first();
    expect((await first.boundingBox())!.y).toBe(headBox.y + headBox.height);
    expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(56);
    const history = page.getByRole('columnheader', { name: 'Lịch sử chi trả', exact: true });
    await history.scrollIntoViewIfNeeded();
    await expect(history).toBeInViewport();
    await row.getByRole('cell', { name: 'Lý Quang Vinh', exact: true }).scrollIntoViewIfNeeded();
    await expect(row.getByRole('cell', { name: 'Lý Quang Vinh', exact: true })).toBeInViewport();
    const pager = page.getByRole('navigation', { name: 'Hiển thị 1–8 / 14 khách', exact: true });
    const size = pager.getByRole('combobox', { name: 'Số dòng mỗi trang' });
    await expect(size).toHaveValue('8');
    for (const control of [customers, size, ...(await pager.getByRole('button').all())]) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    expect((await pager.boundingBox())!.height).toBeLessThanOrEqual(56);
    await size.selectOption('10');
    await expect(page).toHaveURL(/size=10/);
    await page.getByRole('button', { name: 'Trang 2', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await page.reload();
    await expect(customers).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('combobox', { name: 'Số dòng mỗi trang' })).toHaveValue('10');
    await expect(
      page.getByRole('navigation', { name: 'Hiển thị 11–14 / 14 khách', exact: true }),
    ).toBeVisible();
    await page.getByRole('tab', { name: 'Đối soát & chi trả theo tháng', exact: true }).click();
    await expect(page.getByRole('columnheader', { name: 'Tháng', exact: true })).toBeVisible();
  });
}
