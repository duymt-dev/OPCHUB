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
    // D-91 (2): điều khoản trong hộp thoại "Sửa điều khoản" (prototype v4 không có ô này)
    const openTerms = page.getByRole('button', { name: 'Sửa điều khoản', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Điều khoản chương trình' });
    const terms = dialog.getByRole('textbox', { name: 'Điều khoản chương trình', exact: true });
    // D-70 (V4-602): gợi ý giá 2 gói + ô Gọi vốn chỉ đọc thay cho ví dụ theo thành viên 600.000
    await expect(
      page.getByText(
        'Áp dụng trên phí năm thực thu: Gói Cá nhân 1.200.000đ · Gói Doanh nghiệp 3.600.000đ · 3 tháng miễn phí không phát sinh hoa hồng',
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    await expect(page.getByRole('group', { name: 'Hoa hồng Gói Gọi vốn (%)' })).toContainText(
      '= 1.500.000đ / Gói Gọi vốn 15.000.000đ · ghi nhận khi Admin duyệt',
    );
    await expect(page.getByText(/thành viên 600\.000đ/)).toHaveCount(0);
    for (const control of [rate, days, openTerms]) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      if (control !== openTerms) expect(box!.width).toBeGreaterThanOrEqual(240);
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
    await expect(
      page.getByText(
        'Áp dụng trên phí năm thực thu: Gói Cá nhân 1.200.000đ · Gói Doanh nghiệp 3.600.000đ · 3 tháng miễn phí không phát sinh hoa hồng',
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    await expect(page.getByText(/không cần quản trị duyệt/)).toContainText(
      'không tạo đại lý thủ công',
    );
  });
}
