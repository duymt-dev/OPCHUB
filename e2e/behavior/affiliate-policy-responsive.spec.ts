import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

for (const width of [360, 390]) {
  test(`REQ-308 REQ-312 policy fields fit ${width}px; validation blocks PUT and saved terms survive F5`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.getByRole('tab', { name: 'Chính sách', exact: true }).click();
    const rate = page.getByRole('spinbutton', { name: 'GĐ Vùng năm 1', exact: true });
    const days = page.getByRole('spinbutton', {
      name: 'Thời gian ghi nhận link (ngày)',
      exact: true,
    });
    // D-91 (2): điều khoản trong hộp thoại "Sửa điều khoản" (prototype v4 không có ô này)
    const openTerms = page.getByRole('button', { name: 'Sửa điều khoản', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Điều khoản chương trình' });
    const terms = dialog.getByRole('textbox', { name: 'Điều khoản chương trình', exact: true });
    // D-119 supersedes direct-affiliate controls with configured regional sharing examples.
    const plans = page.getByRole('region', { name: 'Phần GĐ Vùng theo từng gói' });
    await expect(plans.getByRole('row')).toHaveCount(4);
    await expect(plans.getByRole('row').filter({ hasText: 'Gói Cá nhân' })).toContainText(
      '1.200.000đ / năm',
    );
    await expect(plans.getByRole('row').filter({ hasText: 'Gói Doanh nghiệp' })).toContainText(
      '3.600.000đ / năm',
    );
    await expect(plans.getByRole('row').filter({ hasText: 'Gói Gọi vốn' })).toContainText(
      '15.000.000đ / dự án',
    );
    await expect(page.getByText(/thành viên 600\.000đ/)).toHaveCount(0);
    for (const control of [rate, days, openTerms]) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      if (control === days) expect(box!.width).toBeGreaterThanOrEqual(240);
      if (control === rate) {
        const field = await rate
          .locator('xpath=ancestor::div[contains(@class,"ant-input-number")][1]')
          .boundingBox();
        expect(field!.width).toBeCloseTo(60, 0); // Outer control, not AntD's padded inner input.
      }
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    let puts = 0;
    page.on('request', (request) => {
      if (request.url().endsWith('/admin/affiliate/policy') && request.method() === 'PUT') puts++;
    });
    await rate.fill('');
    await page.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
    await expect(rate).toHaveAttribute('aria-invalid', 'true');
    expect(puts).toBe(0);
    await rate.fill('25');
    await openTerms.click();
    await expect(terms).toBeVisible();
    const tb = (await terms.boundingBox())!;
    expect(tb.x).toBeGreaterThanOrEqual(0);
    expect(tb.x + tb.width).toBeLessThanOrEqual(width);
    await terms.fill('Điều khoản mobile P4');
    await dialog.getByRole('button', { name: 'Xong', exact: true }).click();
    await expect(dialog).toBeHidden();
    const response = page.waitForResponse(
      (r) => r.url().endsWith('/admin/affiliate/policy') && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
    expect((await response).status()).toBe(200);
    await page.reload();
    await expect(rate).toHaveValue('25');
    await expect(days).toHaveValue('30');
    await openTerms.click();
    await expect(terms).toHaveValue('Điều khoản mobile P4');
    await dialog.getByRole('button', { name: 'Xong', exact: true }).click();
    await expect(plans.getByRole('columnheader', { name: 'Từ năm 2', exact: true })).toBeVisible();
    await expect(plans.getByRole('row').filter({ hasText: 'Gói Cá nhân' })).toContainText(
      '300.000đ',
    );
    await expect(page.getByText(/^Quy tắc: Media Soft/)).toContainText('GĐ Vùng tự quyết tỷ lệ');
    // Leave the public policy unchanged for subsequent native-mode tests.
    await rate.fill('50');
    const restored = page.waitForResponse(
      (r) => r.url().endsWith('/admin/affiliate/policy') && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
    expect((await restored).status()).toBe(200);
  });
}
