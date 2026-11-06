import { loginResponseSchema } from '@opchub/shared/api';
import { storePublicConfigSchema } from '@opchub/shared/api-domains';
import { expect, test, type Page } from '../server/test';
import { PORTAL_URL } from '../urls';

const stores = { annotation: { type: 'demo', description: 'stores' } };
const CARD = 'Trang công khai';
const region = (page: Page) => page.getByRole('region', { name: CARD });

async function owner(page: Page) {
  await page.goto(`${PORTAL_URL}/login?next=%2Fstores%2Fmine`);
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/auth/login' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const session = loginResponseSchema.parse(await (await response).json());
  await expect(region(page)).toBeVisible();
  return session.accessToken;
}

async function config(page: Page, token: string) {
  const json: unknown = await page.evaluate(async (token) => {
    const r = await fetch('/v1/me/store/public', { headers: { authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Config ${r.status}`);
    const data: unknown = await r.json();
    return data;
  }, token);
  return storePublicConfigSchema.parse(json);
}

test(
  'BR-494 guest view: anonymous SSR HTML, SEO whitelist and no private actions',
  stores,
  async ({ page, context }) => {
    expect(await context.cookies()).toHaveLength(0);
    const url = `${PORTAL_URL}/g/htx-ca-phe-hoa-phu`;
    const response = await page.goto(url);
    expect(response?.status()).toBe(200);
    const html = await response?.text();
    expect(html).toContain('HTX Cà phê Hòa Phú');
    expect(html).toContain('Cà phê nhân Robusta loại 1');
    await expect(page.locator('h1')).toHaveText('HTX Cà phê Hòa Phú');
    await expect(page).toHaveTitle(/HTX Cà phê Hòa Phú/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/g\/htx-ca-phe-hoa-phu$/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      /HTX Cà phê Hòa Phú/,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https?:/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    for (const text of [
      'Chỉnh sửa gian hàng',
      'Yêu thích',
      'Dự án OPC',
      'Đang cần',
      'Hồ sơ năng lực',
    ])
      await expect(page.getByText(text, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Tham gia OPC Hub' })).toHaveAttribute(
      'href',
      '/register',
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      const path = test.info().outputPath(`P-V46-GUEST-${width}.png`);
      await page.screenshot({ fullPage: true, path });
      await test.info().attach(`P-V46-GUEST-${width}`, { path, contentType: 'image/png' });
    }
  },
);

test(
  'TC-494 google toggle: persisted noindex then index while guest link remains accessible',
  stores,
  async ({ page, context }) => {
    const token = await owner(page);
    const initial = await config(page, token);
    const toggle = region(page).getByRole('switch', { name: 'Hiển thị trên Google' });
    const save = page.waitForResponse(
      (r) => r.url().endsWith('/me/store/public') && r.request().method() === 'PATCH',
    );
    await toggle.click();
    expect((await save).status()).toBe(200);
    await expect(region(page)).toContainText('Chỉ người có link mới xem được');
    expect((await config(page, token)).seoIndex).toBe(false);
    const guest = await context.newPage();
    expect((await guest.goto(`${PORTAL_URL}/g/${initial.slug}`))?.status()).toBe(200);
    await expect(guest.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    const restore = page.waitForResponse(
      (r) => r.url().endsWith('/me/store/public') && r.request().method() === 'PATCH',
    );
    await toggle.click();
    expect((await restore).status()).toBe(200);
    await guest.reload();
    await expect(guest.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  },
);

test(
  'BR-494 seo fields, copy and view: title/desc persist, limit160, new tab /g link',
  stores,
  async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: PORTAL_URL });
    const token = await owner(page);
    const initial = await config(page, token);
    const title = region(page).getByRole('textbox', { name: 'Tiêu đề trên Google' });
    const desc = region(page).getByRole('textbox', { name: /Mô tả ngắn/ });
    await title.fill('SEO thử nghiệm');
    await desc.fill('x'.repeat(170));
    await expect(desc).toHaveValue('x'.repeat(160));
    await expect(region(page)).toContainText('160/160');
    await desc.blur();
    await expect.poll(async () => (await config(page, token)).desc).toBe('x'.repeat(160));
    await region(page).getByRole('button', { name: 'Sao chép link' }).click();
    await expect(page.getByRole('status')).toHaveText('Đã sao chép link trang công khai');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(initial.url);
    const popup = context.waitForEvent('page');
    await region(page).getByRole('link', { name: 'Xem như khách' }).click();
    const guest = await popup;
    await guest.waitForLoadState();
    await expect(guest).toHaveURL(`${PORTAL_URL}/g/${initial.slug}`);
    await expect(guest).toHaveTitle('SEO thử nghiệm');
    await expect(guest.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'x'.repeat(160),
    );
    await title.fill('');
    await desc.fill('');
    await desc.blur();
    await expect.poll(async () => (await config(page, token)).desc).toBe('');
    await guest.reload();
    await expect(guest).toHaveTitle(initial.defaultTitle);
    // The authenticated detail actions must share the very same public URL, not /stores/:id.
    await page.goto(`${PORTAL_URL}/stores/st1`);
    const detail = page.locator('[data-screen="stores-detail"]');
    await expect(detail.getByRole('link', { name: 'Xem trang hồ sơ công khai' })).toHaveAttribute(
      'href',
      `/g/${initial.slug}`,
    );
    await detail.getByRole('button', { name: 'Chia sẻ', exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(initial.url);
  },
);

test(
  'BR-494 not found: unknown and unpublished links noindex, draft warning, other Portal noindex',
  stores,
  async ({ page, context }) => {
    const token = await owner(page);
    const initial = await config(page, token);
    const status = await page.evaluate(
      async (token) =>
        (
          await fetch('/v1/me/store/unpublish', {
            method: 'POST',
            headers: { authorization: `Bearer ${token}` },
          })
        ).status,
      token,
    );
    expect(status).toBe(200);
    await page.reload();
    await expect(region(page)).toContainText(
      'Trang công khai chỉ hiển thị khi gian hàng đã xuất bản',
    );
    const guest = await context.newPage();
    for (const slug of [initial.slug, 'no-such-store-810']) {
      const response = await guest.goto(`${PORTAL_URL}/g/${slug}`);
      expect(response?.status()).toBe(404);
      await expect(guest.getByRole('heading', { name: 'Không tìm thấy gian hàng' })).toBeVisible();
      await expect(guest.locator('meta[name="robots"]').first()).toHaveAttribute(
        'content',
        /noindex/,
      );
    }
    await guest.goto(`${PORTAL_URL}/login`);
    await expect(guest.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  },
);
