import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';

test.use({ revenueDemo: true });

for (const width of [1440, 390]) {
  test(`REQ-617 sharing layout preserves KPI grid and bank access at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await page
      .locator('input[autocomplete=username], input[type=email]')
      .fill('admin@opchub.community');
    await page.locator('input[type=password]').fill('Admin@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(/\/overview$/);
    await page.goto(`${ADMIN_URL}/affiliate?tab=gdv`, { waitUntil: 'networkidle' });
    const allocated = page.getByText('Tổng phần GĐ Vùng', { exact: true }).locator('..');
    const due = page.getByText('Phải chi cuối tháng', { exact: true }).locator('..');
    const cards = allocated.locator('..');
    await expect(allocated).toContainText('1.680.001đ');
    const boxes = await Promise.all(
      [allocated, due, cards.locator(':scope > div').nth(2)].map((card) => card.boundingBox()),
    );
    const [first, second, third] = boxes;
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(third).not.toBeNull();
    expect(second!.y).toBe(first!.y);
    expect(second!.x).toBeGreaterThan(first!.x + first!.width);
    if (width === 390) {
      expect(third!.x).toBe(first!.x);
      expect(third!.y).toBeGreaterThan(first!.y + first!.height);
    } else {
      expect(third!.y).toBe(first!.y);
      expect(third!.x).toBeGreaterThan(second!.x + second!.width);
    }
    const bank = page.getByText('Vietcombank · 0011 0010 4567', { exact: true });
    await expect(bank).toBeVisible();
    await bank.scrollIntoViewIfNeeded();
    await expect(bank).toBeInViewport();
    const search = page.getByRole('searchbox', { name: 'Tìm GĐ Vùng hoặc vùng...' });
    await search.fill('Miền Bắc');
    await expect(page).toHaveURL(/q=Mi%E1%BB%81n\+B%E1%BA%AFc/);
    await expect(page.getByRole('button', { name: /Trần Quốc Bảo/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Lê Minh Hải/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(
      page.getByRole('button', { name: 'GĐ Vùng đã thu hồi', exact: true }),
    ).toBeVisible();
  });
}
