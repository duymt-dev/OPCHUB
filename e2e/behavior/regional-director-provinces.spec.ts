import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

for (const width of [390, 1440]) {
  test(`REQ-616 province order survives unassignment, reload and reassignment at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.goto(`${ADMIN_URL}/affiliate?tab=gcfg`);
    const north = page.getByRole('article', { name: 'Miền Bắc', exact: true });
    const province = north.getByRole('button', { name: 'Hà Nội', exact: true });
    const chips = north.locator('button[aria-pressed]');
    await expect(province).toHaveAttribute('aria-pressed', 'true');
    const initial = await chips.allTextContents();
    expect(initial[0]).toBe('Hà Nội');
    expect(initial).toHaveLength(15);
    await province.click();
    await expect(province).toHaveAttribute('aria-pressed', 'false');
    await expect(chips).toHaveText(initial);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(province).toHaveAttribute('aria-pressed', 'false');
    await expect(chips).toHaveText(initial);
    await province.click();
    await expect(province).toHaveAttribute('aria-pressed', 'true');
    await expect(chips).toHaveText(initial);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(province).toHaveAttribute('aria-pressed', 'true');
    await expect(chips).toHaveText(initial);
    await expect(north).toContainText('Trần Quốc Bảo');
    await expect(north.getByRole('textbox', { name: 'Số tài khoản' })).toHaveValue('001100104567');
  });
}
