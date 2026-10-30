import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';

test.use({ viewport: { width: 1440, height: 900 } });

test('REQ-616 D-120 director keeps pricing/history but never membership renewal or direct transfer; fundraising remains paid', async ({
  page,
}) => {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('bao.tran@solobooks.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => u.pathname === '/dashboard');

  const badge = page.locator('aside').getByRole('region', { name: 'Gói thành viên', exact: true });
  await expect(badge.getByText('Miễn phí · GĐ Vùng', { exact: true })).toBeVisible();
  await expect(badge.getByText('Miễn phí thành viên trong thời gian đương nhiệm')).toBeVisible();
  await expect(badge.getByText(/^Còn \d+ ngày$/)).toHaveCount(0);
  await expect(
    badge.getByRole('button', { name: /Gia hạn|Thanh toán phí thành viên/ }),
  ).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Gói dịch vụ' })).toHaveCount(0);

  await badge.getByRole('button', { name: 'Xem bảng giá', exact: true }).click();
  const pricing = page.getByRole('dialog', { name: 'Gói dịch vụ', exact: true });
  await expect(pricing.getByText('BẢNG GIÁ THÀNH VIÊN', { exact: true })).toBeVisible();
  await expect(pricing.locator('[data-plan]')).toHaveCount(2);
  await expect(
    pricing.getByRole('button', { name: 'Miễn phí · GĐ Vùng', exact: true }),
  ).toBeDisabled();
  await expect(
    pricing.getByRole('button', { name: 'Đăng ký · 15.000.000đ/dự án', exact: true }),
  ).toBeEnabled();
  await pricing.getByRole('button', { name: 'Đóng', exact: true }).click();

  await page.goto(`${PORTAL_URL}/profile?tab=pay`, { waitUntil: 'networkidle' });
  const billing = page.getByRole('tabpanel');
  await expect(billing.getByText('Miễn phí · GĐ Vùng', { exact: true })).toBeVisible();
  await expect(billing.getByText('Lịch sử thanh toán', { exact: true })).toBeVisible();
  await expect(
    billing.getByRole('button', { name: /Gia hạn|Thanh toán phí thành viên/ }),
  ).toHaveCount(0);

  await page.goto(`${PORTAL_URL}/membership/pay`, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(`${PORTAL_URL}/services`);
  await expect(page.getByText('BẢNG GIÁ THÀNH VIÊN', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Miễn phí · GĐ Vùng', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tôi đã chuyển khoản', exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('button', { name: 'Đăng ký · 15.000.000đ/dự án', exact: true }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  const services = page
    .getByText('Hỗ trợ phát triển doanh nghiệp', { exact: true })
    .locator('..')
    .locator('..');
  await expect(services).toHaveCSS('padding-left', '30px');
  await expect(services).toHaveCSS('padding-right', '30px');
  await expect(services).toHaveCSS('padding-top', '24px');
  await expect(
    page.getByRole('button', { name: 'Miễn phí · GĐ Vùng', exact: true }),
  ).toBeDisabled();
});
