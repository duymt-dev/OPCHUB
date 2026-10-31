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
    const rate = form.getByRole('spinbutton', { name: 'GĐ Vùng năm 1', exact: true });
    const cookie = form.getByRole('spinbutton', { name: 'Thời gian ghi nhận link (ngày)' });
    await expect(rate).toBeEditable();
    await expect(cookie).toBeEditable();
    await expect(rate).toHaveValue('50');
    const sharing = form.getByRole('region', {
      name: 'Quy tắc chia sẻ doanh thu thực thu · Media Soft ↔ GĐ Vùng',
    });
    for (const label of await sharing.locator('.ant-form-item-label > label').all())
      await expect(label).toHaveCSS('font-size', '12px');
    await expect(
      form.locator('label').filter({ hasText: 'Thời gian ghi nhận link (ngày)' }),
    ).toHaveCSS('font-size', '14px');
    for (const hint of await form.locator('.ant-form-item-extra').all()) {
      await expect(hint).toHaveCSS('font-size', '12px');
      // D-91: prototype v4 không đặt line-height → `normal` như chữ gợi ý của prototype
      await expect(hint).toHaveCSS('line-height', 'normal');
    }
    // v4.6 has three compact percent inputs; the cookie control remains full width.
    const inputs = await sharing.locator('.ant-input-number').all();
    for (const input of inputs) {
      const box = await input.boundingBox();
      expect(box!.width).toBeCloseTo(60, 0);
      expect(box!.height).toBeCloseTo(30, 0);
    }
    const [first, second, third] = await Promise.all(inputs.map((input) => input.boundingBox()));
    expect(second!.y).toBeCloseTo(first!.y, 0);
    if (width < 768) {
      expect(third!.x).toBeCloseTo(first!.x, 0);
      expect(third!.y).toBeGreaterThan(first!.y + first!.height);
    } else expect(third!.y).toBeCloseTo(first!.y, 0);
    const cookieBox = await cookie
      .locator('xpath=ancestor::div[contains(@class,"ant-input-number")][1]')
      .boundingBox();
    expect(cookieBox!.height).toBeCloseTo(36, 0);
    const hint = form.locator('.ant-form-item-extra').first();
    const cookieHint = await hint.boundingBox();
    const textInset = await hint.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    // Measure the visible hint text, excluding its own padding box.
    expect(cookieHint!.y + textInset - (cookieBox!.y + cookieBox!.height)).toBeCloseTo(6, 0);
    for (const [name, minimum] of [
      ['Tỷ lệ chia sẻ theo năm của khách', 600],
      ['Phần GĐ Vùng theo từng gói', 680],
    ] as const) {
      const region = form.getByRole('region', { name, exact: true });
      await expect(region).toHaveAttribute('tabindex', '0');
      const box = await region.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect((await region.getByRole('table').boundingBox())!.width).toBeGreaterThanOrEqual(
        minimum,
      );
      if (width < 768) {
        await region.focus();
        await page.keyboard.press('ArrowRight');
        await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      }
    }
    // SRS §20.6 terms stay editable — D-91 (2): behind "Sửa điều khoản" (dialog), not removed.
    await form.getByRole('button', { name: 'Sửa điều khoản', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Điều khoản chương trình' });
    await expect(dialog.getByRole('textbox', { name: 'Điều khoản chương trình' })).toBeEditable();
    await dialog.getByRole('button', { name: 'Xong', exact: true }).click();
    await expect(dialog).toBeHidden();
    // Required validation still blocks an empty sharing rate.
    await rate.fill('');
    await form.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
    await expect(form.locator('.ant-form-item-explain-error').first()).toBeVisible();
    await expect(rate).toHaveAttribute('aria-invalid', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
