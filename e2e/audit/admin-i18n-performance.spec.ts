import { test, expect } from '@playwright/test';
import { auditConfig, locales, routes } from './admin-performance/config';
import { measureRoute } from './admin-performance/measure';
import { expectedCatalog, flightCatalog } from './admin-performance/flight';

for (const locale of locales)
  for (const route of routes)
    test(`D-141 AC824-16 actual cold ${locale} ${route} executable/data/font inventory`, async ({
      browser,
    }, info) => {
      await measureRoute(browser, auditConfig(info.project.metadata), locale, route);
    });

test('D-141 AC824-09/16 concurrent SSR never mixes selected vi/en/th catalogs', async ({
  request,
}, info) => {
  const config = auditConfig(info.project.metadata);
  const results = await Promise.all(
    locales.map(async (locale) => {
      const response = await request.get(`${config.origin}/login`, {
        headers: { Cookie: `NEXT_LOCALE=${locale}` },
      });
      expect(response.ok()).toBe(true);
      const catalog = flightCatalog(await response.text());
      expect(catalog.locale).toBe(locale);
      expect(catalog.messages).toEqual(expectedCatalog(config, locale));
      return locale;
    }),
  );
  expect(results).toEqual([...locales]);
});
