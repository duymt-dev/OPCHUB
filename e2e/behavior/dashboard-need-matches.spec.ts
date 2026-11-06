import { loginResponseSchema } from '@opchub/shared/api';
import {
  needMatchesSchema,
  storeDetailSchema,
  storeUpsertSchema,
} from '@opchub/shared/api-domains';
import { expect, test, type Page } from '../server/test';
import { PORTAL_URL } from '../urls';
import { completeDeclaration } from './helpers/declaration';

const TITLE = 'Nhu cầu phù hợp với gian hàng của bạn';
const NONE =
  'Chưa có nhu cầu phù hợp. Bổ sung ngành, tỉnh và sản phẩm trong gian hàng để AI gợi ý chính xác hơn.';
const card = (page: Page) => page.getByRole('region', { name: TITLE });
const stores = { annotation: { type: 'demo', description: 'stores' } };

async function login(page: Page, email = 'an.nguyen@mediasoft.vn') {
  // Setup on Community prevents priming the60s matches cache before editing the none fixture.
  await page.goto(`${PORTAL_URL}/login?next=%2Fcommunity`);
  await page.locator('input[autocomplete=username],input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('User@2026');
  const pending = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/auth/login' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const session = loginResponseSchema.parse(await (await pending).json());
  await page.waitForURL(/\/community$/);
  return session.accessToken;
}

/** Browser API calls traverse MSW or native identically, no state injection/assertion branching. */
async function api(
  page: Page,
  token: string,
  path: string,
  method = 'GET',
  body: string | null = null,
) {
  const result = await page.evaluate(
    async ({ token, path, method, body }) => {
      const response = await fetch(`/v1${path}`, {
        method,
        ...(body ? { body } : {}),
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      });
      const json: unknown = await response.json();
      return { status: response.status, json };
    },
    { token, path, method, body },
  );
  expect(result.status).toBe(200);
  return result.json;
}

test(
  'BR-478 matching card top3, reasons, percent and navigate/contact targets',
  stores,
  async ({ page }) => {
    const token = await login(page);
    const own = storeDetailSchema.parse(await api(page, token, '/me/store'));
    await api(
      page,
      token,
      '/me/store',
      'PUT',
      JSON.stringify(
        storeUpsertSchema.parse({
          ...own,
          field: 'Nông nghiệp & Nông sản',
        }),
      ),
    );
    const matches = needMatchesSchema.parse(await api(page, token, '/me/needs/matches'));
    expect(matches.rows).toHaveLength(3);
    await page.locator('aside nav').getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(card(page)).toBeVisible();
    await expect(card(page)).toContainText(
      'AI gợi ý theo ngành, tỉnh/thành và sản phẩm trong gian hàng · 3 nhu cầu',
    );
    await expect(card(page).locator('[data-match-id]')).toHaveCount(3);
    const first = matches.rows[0];
    if (!first) throw new Error('matching fixture missing');
    const row = card(page).locator('[data-match-id]').first();
    await expect(row).toContainText(first.title);
    await expect(row).toContainText(`${first.pct}%`);
    await expect(row).toContainText('mức phù hợp');
    const reasons = { field: 'Đúng ngành', province: 'Cùng tỉnh', product: 'Khớp sản phẩm' };
    for (const reason of first.reasons) await expect(row).toContainText(reasons[reason]);
    await row.getByRole('button', { name: 'Xem & liên hệ' }).click();
    await expect(page).toHaveURL(`${PORTAL_URL}/needs?q=${encodeURIComponent(first.title)}`);
    const need = page
      .locator('[data-screen="needs-list"] [data-need]')
      .filter({ hasText: first.title })
      .first();
    await expect(need).toBeVisible();
    await expect(need.getByRole('link', { name: 'Zalo', exact: true })).toHaveAttribute(
      'href',
      /^https:\/\/zalo\.me\//,
    );
    await page.locator('aside nav').getByRole('link', { name: 'Dashboard', exact: true }).click();
    await card(page).getByRole('button', { name: 'Xem tất cả nhu cầu' }).click();
    await expect(page).toHaveURL(
      `${PORTAL_URL}/needs?field=${encodeURIComponent(matches.storeField ?? '')}`,
    );
  },
);

test(
  'BR-480 none: draft store without field/province shows0 and guidance on mobile',
  stores,
  async ({ page }) => {
    const token = await login(page);
    await api(page, token, '/me/store/unpublish', 'POST');
    const store = storeDetailSchema.parse(await api(page, token, '/me/store'));
    const body = storeUpsertSchema.parse({ ...store, field: '', province: '' });
    await api(page, token, '/me/store', 'PUT', JSON.stringify(body));
    await page.locator('aside nav').getByRole('link', { name: 'Dashboard', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(card(page)).toBeVisible();
    await expect(card(page)).toContainText(NONE);
    await expect(card(page)).toContainText('· 0 nhu cầu');
    await expect(card(page).locator('[data-match-id]')).toHaveCount(0);
    await expect(card(page).getByRole('button', { name: 'Cập nhật gian hàng' })).toHaveCount(0);
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
  },
);

test('BR-480 personal account has no card and sends no matches request', async ({ page }) => {
  let calls = 0;
  page.on('request', (r) => {
    if (new URL(r.url()).pathname === '/v1/me/needs/matches') calls += 1;
  });
  await page.goto(`${PORTAL_URL}/login`);
  await page.getByRole('tab', { name: 'Đăng ký' }).click();
  await page.getByRole('button', { name: /^Cá nhân/ }).click();
  await page.getByPlaceholder('Nguyễn Văn An').fill('Match Personal');
  await page.getByPlaceholder('ban@congty.vn').fill(`match-personal-${Date.now()}@test.vn`);
  await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await page.getByLabel('Mã OTP').fill('123456');
  await page.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
  await page
    .getByRole('dialog', { name: 'Đã gửi email chào mừng' })
    .getByRole('button', { name: 'Đóng', exact: true })
    .click();
  await completeDeclaration(page);
  await page.locator('aside nav').getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByText('Hướng dẫn bắt đầu', { exact: true })).toBeVisible();
  await expect(card(page)).toHaveCount(0);
  expect(calls).toBe(0);
});
