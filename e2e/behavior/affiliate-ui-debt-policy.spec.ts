import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

for (const width of [1440, 390]) {
  test(`D-84-POL TD-P4-UI-03 policy labels, hints and rules keep prototype type scale at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.goto(`${ADMIN_URL}/affiliate?tab=cfg`);
    const form = page.getByRole('form', { name: 'Chính sách', exact: true });
    await expect(form).toBeVisible();
    const rate = form.getByRole('spinbutton', { name: 'Tỷ lệ hoa hồng mặc định (%)' });
    const cookie = form.getByRole('spinbutton', { name: 'Thời gian ghi nhận link (ngày)' });
    await expect(rate).toBeEditable();
    await expect(cookie).toBeEditable();
    await expect(rate).toHaveValue('20');
    await expect(form.getByText('= 120.000đ / thành viên 600.000đ')).toBeVisible();
    for (const label of await form.locator('.ant-form-item-label > label').all())
      await expect(label).toHaveCSS('font-size', '14px');
    for (const hint of await form.locator('.ant-form-item-extra').all()) {
      await expect(hint).toHaveCSS('font-size', '12px');
      await expect(hint).toHaveCSS('line-height', '18px');
    }
    // Rate field, preview and the next label keep the prototype rhythm (input 34px, ≤ 40px
    // from the rate input to the cookie label instead of the old 60px stack).
    const [field, hint, next] = await Promise.all([
      form.locator('.ant-input-number').first().boundingBox(),
      form.locator('.ant-form-item-extra').first().boundingBox(),
      form.locator('.ant-form-item-label').nth(1).boundingBox(),
    ]);
    if (!field || !hint || !next) throw new Error('Policy fields and preview must be laid out');
    expect(field.height).toBeLessThanOrEqual(34.5);
    expect(hint.y - (field.y + field.height)).toBeLessThanOrEqual(6.5);
    if (width < 768) expect(next.y - (field.y + field.height)).toBeLessThanOrEqual(40);
    // Required editable terms and validation are kept, not hidden to match the prototype.
    const terms = form.getByRole('textbox', { name: 'Điều khoản chương trình' });
    await expect(terms).toBeEditable();
    // Required validation still blocks an empty default rate (InputNumber clamps >50 itself).
    await rate.fill('');
    await form.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
    await expect(form.locator('.ant-form-item-explain-error').first()).toBeVisible();
    await expect(rate).toHaveAttribute('aria-invalid', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
