import { expect, type Browser, type Page, type Response } from '@playwright/test';
import { adminLoginResponseSchema } from '@opchub/shared/api';
import { adminOverviewSchema, generalSettingsSchema } from '@opchub/shared/api-domains';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { bytes, expectedCatalog, flightCatalog } from './flight';
import { observeAssets } from './assets';
import type { AuditConfig, locales, routes } from './config';

async function dataReady(
  page: Page,
  config: AuditConfig,
  locale: (typeof locales)[number],
  route: (typeof routes)[number],
  data: Promise<Response> | undefined,
) {
  if (route === '/login') {
    const labels = z
      .object({ auth: z.object({ login: z.object({ title: z.string() }) }) })
      .parse(expectedCatalog(config, locale));
    await expect(
      page.getByRole('heading', { name: labels.auth.login.title, exact: true }),
    ).toBeVisible();
  } else await expect(page.locator('h1')).toBeVisible();
  if (route === '/overview' && data) {
    const raw = adminOverviewSchema.parse(await (await data).json());
    const number = new Intl.NumberFormat({ vi: 'vi-VN', en: 'en-GB', th: 'th-TH' }[locale]);
    await expect(
      page
        .locator('a[href="/fees"]')
        .getByText(`${number.format(raw.flow.paidMembers)} / ${number.format(raw.flow.members)}`, {
          exact: true,
        }),
    ).toBeVisible();
  } else if (route === '/settings' && data) {
    const raw = generalSettingsSchema.parse(await (await data).json());
    const labels = z
      .object({ settings: z.object({ general: z.object({ name: z.string() }) }) })
      .parse(expectedCatalog(config, locale));
    await expect(page.getByLabel(labels.settings.general.name, { exact: true })).toHaveValue(
      raw.platformName,
    );
  } else if (route === '/profile') {
    await expect(page.locator('input[value="admin@opchub.community"]')).toBeVisible();
  }
}

export async function measureRoute(
  browser: Browser,
  config: AuditConfig,
  locale: (typeof locales)[number],
  route: (typeof routes)[number],
) {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1440, height: 1000 },
  });
  try {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: config.origin }]);
    if (route !== '/login') {
      // Only session creation; no bootstrap/seed/SQL/business write. Never serialize auth data.
      const login = await context.request.post(`${config.origin}/v1/admin/auth/login`, {
        data: { identifier: 'admin@opchub.community', password: 'Admin@2026', remember: false },
      });
      expect(login.status()).toBe(200);
      adminLoginResponseSchema.parse(await login.json());
    }
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    const finish = observeAssets(page);
    const endpoint =
      route === '/overview'
        ? '/v1/admin/overview'
        : route === '/settings'
          ? '/v1/admin/settings/general'
          : undefined;
    const data = endpoint
      ? page.waitForResponse((r) => new URL(r.url()).pathname === endpoint && r.ok())
      : undefined;
    void data?.catch(() => undefined);
    const response = await page.goto(`${config.origin}${route}`, { waitUntil: 'networkidle' });
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(`${config.origin}${route}`);
    // Original baseline hardcodes html lang=vi although its request catalog has a locale.
    // Preserve that measured historical defect; current must honor the selected identity.
    await expect(page.locator('html')).toHaveAttribute(
      'lang',
      config.version === 'baseline' ? 'vi' : locale,
    );
    await dataReady(page, config, locale, route, data);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    if (!response) throw new Error('Missing document response');
    const html = await response.text();
    const catalog = flightCatalog(html);
    expect(catalog.locale).toBe(locale);
    expect(catalog.messages).toEqual(expectedCatalog(config, locale));
    const resources = await finish();
    expect(resources.errors).toEqual([]);
    expect(resources.failures).toEqual([]);
    expect(resources.writes).toEqual([]);
    expect(resources.totals.jsGzip).toBeGreaterThan(0);
    const receipt = {
      version: config.version,
      source: config.source,
      buildId: readFileSync(resolve(config.build, 'BUILD_ID'), 'utf8').trim(),
      locale,
      route,
      cache: 'fresh context; CDP cache disabled; service workers blocked; no prior route JS',
      html: bytes(html),
      flight: catalog.flight,
      catalog: bytes(JSON.stringify(catalog.messages)),
      ...resources,
    };
    writeFileSync(
      resolve(config.output, `${config.version}-${locale}-${route.slice(1)}.json`),
      JSON.stringify(receipt, null, 2) + '\n',
    );
  } finally {
    await context.close();
  }
}
