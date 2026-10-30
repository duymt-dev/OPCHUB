import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

for (const width of [390, 1440]) {
  test(`REQ-616 bank edits require save and survive reload without changing assignment at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.goto(`${ADMIN_URL}/affiliate?tab=gcfg`);
    const north = page.getByRole('article', { name: 'Miền Bắc', exact: true });
    const account = north.getByRole('textbox', { name: 'Số tài khoản', exact: true });
    const holder = north.getByRole('textbox', { name: 'Chủ tài khoản', exact: true });
    const save = north.getByRole('button', { name: 'Lưu tài khoản nhận', exact: true });
    await expect(account).toHaveValue('001100104567');
    const originalHolder = await holder.inputValue();
    const provinces = await north.locator('button[aria-pressed="true"]').allTextContents();

    await account.fill('001100104568');
    await expect(save).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(account).toHaveValue('001100104567');
    await expect(save).toHaveCount(0);

    await account.fill('001100104568');
    await holder.fill('TRAN QUOC BAO TEST');
    await save.click();
    await expect(save).toHaveCount(0);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(account).toHaveValue('001100104568');
    await expect(holder).toHaveValue('TRAN QUOC BAO TEST');
    await expect(north).toContainText('Trần Quốc Bảo');
    await expect(north.locator('button[aria-pressed="true"]')).toHaveText(provinces);

    await account.fill('001100104567');
    await holder.fill(originalHolder);
    await save.click();
    await expect(save).toHaveCount(0);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(account).toHaveValue('001100104567');
    await expect(holder).toHaveValue(originalHolder);
  });
}
