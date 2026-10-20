import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

for (const width of [360, 390]) {
  test(`REQ-312 agent cards expose every column, selection and detail at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.getByRole('tab', { name: /^Affiliate/ }).click();
    await page.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill('HAOPC');
    const row = page.getByRole('row').filter({ hasText: 'HAOPC' });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('link', { name: 'Lê Thu Hà', exact: true })).toBeVisible();
    await expect(row).toContainText('ha.le@opcmedia.vn');
    await expect(row).toContainText('25%');
    await expect(row).toContainText('7.800.000đ');
    await expect(row).toContainText('750.000đ');
    const cells = row.getByRole('cell');
    await expect(cells).toHaveCount(9);
    for (const cell of await cells.all()) {
      await expect(cell).toBeVisible();
      const box = await cell.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await row.getByRole('checkbox').check();
    await expect(row.getByRole('checkbox')).toBeChecked();
    await page.getByRole('button', { name: 'Bỏ chọn', exact: true }).click();
    await expect(row.getByRole('checkbox')).not.toBeChecked();
    await row.getByRole('link', { name: 'Đối soát & chi trả', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Lê Thu Hà', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Lê Thu Hà', exact: true })).toBeVisible();
    await page.goto(`${ADMIN_URL}/affiliate?tab=aff&q=absent-agent-987654321`);
    const empty = page.getByRole('cell').filter({ hasText: 'Chưa có dữ liệu' });
    await expect(empty).toBeVisible();
    expect((await empty.boundingBox())!.width).toBeGreaterThanOrEqual(250);
  });
}
