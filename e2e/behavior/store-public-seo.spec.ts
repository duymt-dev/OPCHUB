import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';

const slug = 'htx-ca-phe-hoa-phu';
test('REQ-627 B15 public SEO: JSON-LD matches visible business and canonical/OG/Twitter', async ({
  page,
}) => {
  await page.goto(`${PORTAL_URL}/g/${slug}`);
  const script = page.locator('script[type="application/ld+json"]');
  await expect(script).toHaveCount(1);
  const data = JSON.parse((await script.textContent()) ?? '{}') as Record<string, unknown>;
  expect(data['@type']).toBe('LocalBusiness');
  expect(data.name).toBe(await page.locator('h1').textContent());
  expect(data.url).toBe(`https://opchub.community/g/${slug}`);
  for (const key of ['review', 'aggregateRating', 'priceRange', 'openingHours', 'team'])
    expect(data).not.toHaveProperty(key);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    'content',
    'HTX Cà phê Hòa Phú',
  );
  expect(data.image).toBe(await page.locator('meta[property="og:image"]').getAttribute('content'));
  // webdriver must not inflate public traffic during any automated browser journey.
  const views: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith(`/public/stores/${slug}/view`)) views.push(r.url());
  });
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  expect(views).toHaveLength(0);
});

test('REQ-627 B15 robots isolate duplicate hosts and sitemap contains only public URLs', async ({
  request,
}) => {
  const canonical = await request.get(`${PORTAL_URL}/robots.txt`, {
    headers: { Host: 'opchub.community' },
  });
  expect(canonical.status()).toBe(200);
  const rules = await canonical.text();
  expect(rules).toContain('Allow: /g/');
  expect(rules).toContain('Disallow: /dashboard');
  expect(rules).toContain('Sitemap: https://opchub.community/sitemap.xml');
  const duplicate = await request.get(`${PORTAL_URL}/robots.txt`, {
    headers: { Host: 'app.opchub.community' },
  });
  expect(duplicate.status()).toBe(200);
  expect(await duplicate.text()).toContain('Disallow: /');
  expect(await duplicate.text()).not.toContain('Allow: /g/');
  const sitemap = await request.get(`${PORTAL_URL}/sitemap.xml`);
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain(`https://opchub.community/g/${slug}`);
  expect(xml).toContain('https://opchub.community/huong-dan');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(urls.length).toBeGreaterThan(1);
  expect(
    urls.every((url) => /^https:\/\/opchub\.community\/(g\/[^/]+|huong-dan)$/.test(url ?? '')),
  ).toBe(true);
});

test('REQ-627 B15 generated OG is PNG1200x630; unknown store has no image disclosure', async ({
  request,
}) => {
  const response = await request.get(`${PORTAL_URL}/g/${slug}/opengraph-image`);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/png');
  const png = await response.body();
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  const missing = await request.get(`${PORTAL_URL}/g/no-such-store-820/opengraph-image`);
  expect(missing.status()).toBe(404);
  expect(await missing.text()).not.toContain('HTX Cà phê Hòa Phú');
});
