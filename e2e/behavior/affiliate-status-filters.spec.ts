import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

for (const width of [1440, 390]) {
  test(`REQ-310 REQ-312 commission status filters preserve rows, totals and F5 at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    const rows = page.locator('tbody tr[data-row-key]');
    await expect(rows).toHaveCount(10);
    for (const { key, label, total } of [
      { key: 'recorded', label: 'Đã ghi nhận', total: 19 },
      { key: 'paid', label: 'Đã chi trả', total: 31 },
      { key: 'cancelled', label: 'Đã hủy', total: 1 },
    ]) {
      const radio = page.getByRole('radio', { name: new RegExp(`^${label}`) });
      await page.locator('label').filter({ has: radio }).click();
      await expect(radio).toBeChecked();
      await expect(page).toHaveURL(new RegExp(`[?&]status=${key}(?:&|$)`));
      await expect(rows).toHaveCount(Math.min(total, 10));
      await expect(
        page.getByText(`Hiển thị 1–${Math.min(total, 10)} / ${total} giao dịch`, { exact: true }),
      ).toBeVisible();
      for (const row of await rows.all()) {
        await expect(row.getByText(label, { exact: true })).toBeVisible();
        await expect(row.getByRole('cell', { name: '600.000đ', exact: true })).toBeVisible();
      }
      const first = await rows.first().textContent();
      if (!first) throw new Error('Filtered first row must contain commission data');
      await page.reload();
      await expect(radio).toBeChecked();
      await expect(rows).toHaveCount(Math.min(total, 10));
      await expect(rows.first()).toHaveText(first);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    }
  });
}
