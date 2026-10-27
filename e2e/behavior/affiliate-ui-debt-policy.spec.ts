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
    await expect(
      form.getByText('Áp dụng trên phí năm: Gói Cá nhân 1.200.000đ · Gói Doanh nghiệp 3.600.000đ'),
    ).toBeVisible();
    for (const label of await form.locator('.ant-form-item-label > label').all())
      await expect(label).toHaveCSS('font-size', '14px');
    for (const hint of await form.locator('.ant-form-item-extra').all()) {
      await expect(hint).toHaveCSS('font-size', '12px');
      // D-91: prototype v4 không đặt line-height → `normal` như chữ gợi ý của prototype
      await expect(hint).toHaveCSS('line-height', 'normal');
    }
    // Rate field, plan hint and the next field keep the prototype rhythm: input 36px, hint 6px
    // below, next field ≤ 16px under the hint (prototype grid gap 14px). V4-602: hint v4 wraps to
    // two lines at 390px, so the bound is measured from the hint, not from the input.
    const [field, hint, next] = await Promise.all([
      form.locator('.ant-input-number').first().boundingBox(),
      form.locator('.ant-form-item-extra').first().boundingBox(),
      // D-70 (V4-602): ô chỉ đọc "Hoa hồng Gói Gọi vốn (%)" nằm giữa như prototype v4
      form.getByRole('group', { name: 'Hoa hồng Gói Gọi vốn (%)' }).boundingBox(),
    ]);
    if (!field || !hint || !next) throw new Error('Policy fields and preview must be laid out');
    // Prototype v4: input 36px, gợi ý cách 6px (gap 6 của label)
    expect(field.height).toBeCloseTo(36, 0);
    expect(hint.y - (field.y + field.height)).toBeLessThanOrEqual(6.5);
    if (width < 768) expect(next.y - (hint.y + hint.height)).toBeLessThanOrEqual(16);
    // SRS §20.6 terms stay editable — D-91 (2): behind "Sửa điều khoản" (dialog), not removed.
    await form.getByRole('button', { name: 'Sửa điều khoản', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Điều khoản chương trình' });
    await expect(dialog.getByRole('textbox', { name: 'Điều khoản chương trình' })).toBeEditable();
    await dialog.getByRole('button', { name: 'Xong', exact: true }).click();
    await expect(dialog).toBeHidden();
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
