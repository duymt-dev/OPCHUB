import { test, expect, openLocalized } from './admin-i18n/fixtures';
import { selectLocale } from './admin-i18n/navigation';

// Fixed translated identities only. km/my still require catalogs and actual locale acceptance.
const LOCALES = ['lo', 'vi', 'en', 'th', 'zh', 'id', 'ms', 'ms-BN', 'fil', 'en-SG'] as const;
const RANGES = [
  ['nonambiguous', '2026-11-21', '2026-11-30'],
  ['year-boundary', '2026-12-31', '2027-01-01'],
  ['leap-day', '2024-02-28', '2024-02-29'],
] as const;

// Explicit canonical split, never Intl or the production formatter under test.
function expectedDate(value: string, locale: string): string {
  const [year, month, day] = value.split('-');
  return locale === 'zh'
    ? `${year}/${month}/${day}`
    : locale === 'fil'
      ? `${month}/${day}/${year}`
      : `${day}/${month}/${year}`;
}

for (const width of [1440, 390])
  for (const [name, from, to] of RANGES) {
    test(`D-141 AC824-08/09 actual picker ${name} ${width}, ten translated identities not full Intl acceptance`, async ({
      page,
      guard,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const requests: string[] = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.pathname === '/v1/admin/overview') requests.push(url.search);
      });
      const path = `/overview?from=${from}&to=${to}&period=month`;
      await openLocalized(page, path, 'lo');
      const inputs = page.locator('.ant-picker-range .ant-picker-input input');
      await expect(inputs).toHaveCount(2);
      for (const locale of LOCALES) {
        if (locale !== 'lo') await selectLocale(page, locale);
        await expect(inputs.nth(0)).toHaveValue(expectedDate(from, locale));
        await expect(inputs.nth(1)).toHaveValue(expectedDate(to, locale));
        const url = new URL(page.url());
        expect(url.pathname).toBe('/overview');
        expect(url.searchParams.get('from')).toBe(from);
        expect(url.searchParams.get('to')).toBe(to);
        expect(url.searchParams.get('period')).toBe('month');
        await guard.settle();
      }
      expect(requests.length).toBeGreaterThan(0);
      for (const search of requests) {
        const query = new URLSearchParams(search);
        expect(query.get('from')).toBe(from);
        expect(query.get('to')).toBe(to);
        // Existing serializer omits the default; URL state still retains explicit period=month.
        expect(query.get('period')).toBeNull();
        expect([...query.keys()].sort()).toEqual(['from', 'to']);
      }
      // F5 must keep selected alias identity and canonical range, not locale-formatted URL values.
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-SG');
      await expect(inputs.nth(0)).toHaveValue(expectedDate(from, 'en-SG'));
      await expect(inputs.nth(1)).toHaveValue(expectedDate(to, 'en-SG'));
      expect(new URL(page.url()).search).toBe(`?from=${from}&to=${to}&period=month`);
    });
  }
