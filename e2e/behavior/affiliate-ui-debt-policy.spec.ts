import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';
test.use({ affiliateDemo: true });
for (const width of [1440, 390])
  test(`REQ-619 D-132 policy type scale follows share prototype at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.goto(`${ADMIN_URL}/affiliate?tab=cfg`);
    const form = page.getByRole('form', { name: 'Chính sách', exact: true });
    await expect(form.getByRole('table', { name: 'Năm của khách' })).toHaveCSS('font-size', '13px');
    await expect(form.getByRole('table', { name: 'Phần GĐ Vùng theo từng gói' })).toHaveCSS(
      'font-size',
      '13px',
    );
    const rate = form.getByRole('spinbutton', { name: 'GĐ Vùng năm 1', exact: true });
    await expect(rate).toHaveCSS('font-size', '13px');
    await expect(
      form.getByRole('spinbutton', { name: 'Thời gian ghi nhận link (ngày)' }),
    ).toHaveCSS('font-size', '14px');
    await form.getByRole('button', { name: 'Sửa điều khoản' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Điều khoản chương trình' }).getByRole('textbox'),
    ).toBeEditable();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
