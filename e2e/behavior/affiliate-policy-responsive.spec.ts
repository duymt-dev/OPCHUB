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
    const rate = page.getByRole('spinbutton', { name: 'Tỷ lệ hoa hồng mặc định (%)', exact: true });
    const days = page.getByRole('spinbutton', {
      name: 'Thời gian ghi nhận link (ngày)',
      exact: true,
    });
    const terms = page.getByRole('textbox', { name: 'Điều khoản chương trình', exact: true });
    await expect(page.getByText('= 120.000đ / thành viên 600.000đ', { exact: true })).toBeVisible();
    for (const control of [rate, days, terms]) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(240);
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
    const preview = page.waitForResponse((r) =>
      r.url().endsWith('/admin/affiliate/policy/preview?rate=25'),
    );
    await rate.fill('25');
    const previewResponse = await preview;
    expect(previewResponse.status()).toBe(200);
    expect(await previewResponse.json()).toEqual({
      rate: 25,
      feeAmount: 600000,
      commission: 150000,
    });
    await expect(page.getByText('= 150.000đ / thành viên 600.000đ', { exact: true })).toBeVisible();
    await terms.fill('Điều khoản mobile P4');
    const response = page.waitForResponse(
      (r) => r.url().endsWith('/admin/affiliate/policy') && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
    expect((await response).status()).toBe(200);
    await page.reload();
    await expect(rate).toHaveValue('25');
    await expect(days).toHaveValue('30');
    await expect(terms).toHaveValue('Điều khoản mobile P4');
    await expect(page.getByText('= 150.000đ / thành viên 600.000đ', { exact: true })).toBeVisible();
    await expect(page.getByText(/không cần quản trị duyệt/)).toContainText(
      'không tạo đại lý thủ công',
    );
  });
}
