import { onboardingSchema } from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';
import { directorSession } from './helpers/director-session';

test.use({ affiliateDemo: true });

test('A10 regional director browses every feed without paywall', async ({ page }) => {
  const blocked: string[] = [];
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname;
    if (response.status() === 402 && path.startsWith('/v1/')) blocked.push(path);
  });
  const onboarding = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/me/onboarding' && r.request().method() === 'GET',
  );
  await directorSession(page);
  const response = await onboarding;
  expect(response.status()).toBe(200);
  const state = onboardingSchema.parse(await response.json());
  expect(state.paid).toBe(true);
  expect(state.steps.find((step) => step.key === 'pay')?.done).toBe(true);
  expect(state.steps.every((step) => !step.locked)).toBe(true);
  await expect(page.locator('[data-step="pay"]')).toHaveAttribute('data-state', 'done');
  await expect(page.locator('[data-onb="card"] [data-state="locked"]')).toHaveCount(0);

  for (const [path, content] of [
    ['/dashboard', 'Hướng dẫn bắt đầu'],
    ['/community', 'Khám phá cộng đồng'],
    ['/chat', 'Chat nhóm'],
    ['/events', 'Sự kiện sắp tới'],
    ['/projects', 'Dự án OPC'],
    ['/needs', 'Nhu cầu địa phương'],
    ['/stores', 'Khám phá doanh nghiệp, sản phẩm và cơ hội kinh doanh địa phương'],
    ['/services', 'BẢNG GIÁ THÀNH VIÊN'],
    ['/affiliate?tab=reg', 'Phần được chia theo năm của khách'],
  ] as const) {
    await test.step(path, async () => {
      await page.goto(`${PORTAL_URL}${path}`);
      await expect(page.getByRole('main')).toContainText(content);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('dialog', { name: 'Gói dịch vụ', exact: true })).toHaveCount(0);
      await expect(page.getByRole('dialog', { name: /^Thanh toán Gói / })).toHaveCount(0);
      expect(blocked).toEqual([]);
    });
  }
  await expect(page.getByRole('tab', { name: /Vùng của tôi/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Thông báo', exact: true }).click();
  await expect(page.getByRole('tab', { name: /^Tất cả/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Chưa đọc/ })).toBeVisible();
  expect(blocked).toEqual([]);
});
