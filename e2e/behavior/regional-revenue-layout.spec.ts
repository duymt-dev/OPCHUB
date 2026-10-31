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
    await expect(page.getByRole('button', { name: 'GĐ Vùng đã thu hồi', exact: true })).toHaveCount(
      0,
    );
    const director = page.getByRole('button', { name: /Trần Quốc Bảo/ });
    await director.click();
    await expect(director).toHaveAttribute('aria-expanded', 'true');
    const ledger = page.getByRole('region', { name: 'Khoản ghi nhận cho GĐ Vùng', exact: true });
    await expect(ledger.getByRole('row')).toHaveCount(5);
    await expect(ledger).toContainText('Khách chia sẻ năm một');
    await expect(ledger).toContainText('600.001đ');
    const detail = ledger.locator('..');
    await expect(detail).toHaveCSS('padding', '14px 16px 16px 40px');
    await expect(detail.locator('..')).toHaveCSS('padding', '0px');
    const heading = ledger.getByRole('columnheader', { name: 'Ngày', exact: true });
    const headingBox = await heading.boundingBox();
    expect(headingBox).not.toBeNull();
    expect(headingBox!.height).toBeLessThanOrEqual(34);
    expect(headingBox!.height).toBeGreaterThanOrEqual(24);
    await expect(page.getByRole('region', { name: 'Lịch sử chi trả', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await director.click();
    await expect(director).toHaveAttribute('aria-expanded', 'false');
    await expect(ledger).toBeHidden();
    await search.fill('ZZZ-NO-DIRECTOR');
    await expect(page).toHaveURL(/q=ZZZ-NO-DIRECTOR/);
    const empty = page.getByText('Không tìm thấy GĐ Vùng phù hợp.', { exact: true });
    await expect(empty).toBeVisible();
    await expect(empty).toHaveAttribute('role', 'status');
    await expect(empty).toHaveCSS('font-size', '12px');
    await expect(empty).toHaveCSS('color', 'rgba(0, 0, 0, 0.65)');
    const emptyBox = await empty.boundingBox();
    expect(emptyBox).not.toBeNull();
    expect(emptyBox!.height).toBeGreaterThanOrEqual(16);
    await empty.scrollIntoViewIfNeeded();
    await expect(empty).toBeInViewport();
    await expect(page.getByRole('columnheader', { name: 'GĐ Vùng', exact: true })).toBeVisible();
    await expect(director).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(search).toHaveValue('ZZZ-NO-DIRECTOR');
    await expect(empty).toBeVisible();
    await search.fill('');
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(director).toBeVisible();
    await expect(empty).toHaveCount(0);
  });
}
