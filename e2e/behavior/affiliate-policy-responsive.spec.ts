import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';
test.use({ affiliateDemo: true });
for (const width of [1440, 390])
  test(`REQ-619 D-132 policy responsive and hidden values survive save at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.goto(`${ADMIN_URL}/affiliate?tab=cfg`);
    const rate = page.getByLabel('GĐ Vùng năm 1', { exact: true }),
      cookie = page.getByLabel('Thời gian ghi nhận link (ngày)', { exact: true });
    await expect(page.getByRole('table', { name: 'Năm của khách' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Phần GĐ Vùng theo từng gói' })).toBeVisible();
    if (width === 390) {
      const first = await rate.boundingBox();
      const step = await page.getByLabel('Giảm mỗi năm từ năm 2', { exact: true }).boundingBox();
      expect(first).not.toBeNull();
      expect(step?.y).toBe(first?.y);
      expect(step?.x ?? 0).toBeGreaterThan(first?.x ?? 0);
      const list = await page.getByRole('tablist').boundingBox();
      const selected = await page
        .getByRole('tab', { name: 'Chính sách', exact: true })
        .boundingBox();
      expect(selected?.x ?? -1).toBeGreaterThanOrEqual(list?.x ?? 0);
      expect((selected?.x ?? 0) + (selected?.width ?? 0)).toBeLessThanOrEqual(
        (list?.x ?? 0) + (list?.width ?? 0) + 1,
      );
    }
    await expect(page.getByRole('spinbutton', { name: 'Tỷ lệ hoa hồng mặc định (%)' })).toHaveCount(
      0,
    );
    await rate.fill('');
    await page.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
    await expect(rate).toHaveAttribute('aria-invalid', 'true');
    await rate.fill('60');
    await cookie.fill('45');
    await page.getByRole('button', { name: 'Sửa điều khoản' }).click();
    const dialog = page.getByRole('dialog', { name: 'Điều khoản chương trình' });
    await dialog.getByRole('textbox').fill('Điều khoản mobile D-132');
    await dialog.getByRole('button', { name: 'Xong' }).click();
    const response = page.waitForResponse(
      (r) => r.url().endsWith('/admin/affiliate/policy') && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
    const saved = await response;
    expect(saved.status()).toBe(200);
    expect(saved.request().postDataJSON()).toMatchObject({
      defaultRate: 20,
      fundraisingRate: 10,
      renewalRate: 10,
      renewalMaxYear: 3,
    });
    await page.reload();
    await expect(rate).toHaveValue('60');
    await expect(cookie).toHaveValue('45');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
