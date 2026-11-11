import { pageSchema } from '@opchub/shared/api';
import { feeRowSchema, feeSummarySchema } from '@opchub/shared/api-domains';
import { test, expect, openEnglish } from './admin-i18n/fixtures';
import { selectLocale } from './admin-i18n/navigation';
import feesLo from '../../apps/admin/messages/lo/fees.json' with { type: 'json' };
import feesEn from '../../apps/admin/messages/en/fees.json' with { type: 'json' };
import authLo from '../../apps/admin/messages/lo/auth.json' with { type: 'json' };
import { ADMIN_URL } from '../urls';
import { env } from '../env';
import { createHash } from 'node:crypto';
import chunkReceipt from '../../coding-packs/reports/evidence/v46-824/intl-chunks.json' with { type: 'json' };

// Independent Node full-ICU references, not an import of the app's formatter under test.
const date = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Ho_Chi_Minh',
    calendar: 'gregory',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
const money = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

async function runtimeSnapshot(page: Parameters<typeof selectLocale>[0]) {
  return page.evaluate(() => {
    const buffers = globalThis as typeof globalThis & {
      __FORMATJS_DATETIMEFORMAT_DATA__?: { locale: string }[];
      __FORMATJS_NUMBERFORMAT_DATA__?: { locale: string }[];
    };
    return {
      date: Intl.DateTimeFormat.toString(),
      number: Intl.NumberFormat.toString(),
      dateLocales: (buffers.__FORMATJS_DATETIMEFORMAT_DATA__ ?? []).map((entry) => entry.locale),
      numberLocales: (buffers.__FORMATJS_NUMBERFORMAT_DATA__ ?? []).map((entry) => entry.locale),
    };
  });
}

for (const width of [1440, 390]) {
  test(`D-141 AC824-08/11/16 actual Lao fees match independent Node dates/currency and selected Intl registration ${width}`, async ({
    page,
    guard,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const assets = chunkReceipt.builds[env.E2E_TARGET].assets;
    const loaded = new Set<string>();
    const pending: Promise<void>[] = [];
    page.on('response', (response) => {
      const path = new URL(response.url()).pathname;
      const asset = assets.find((candidate) => candidate.path === path);
      if (!asset) return;
      loaded.add(path);
      const check = (async () => {
        expect(response.ok()).toBe(true);
        expect(
          createHash('sha256')
            .update(await response.body())
            .digest('hex'),
        ).toBe(asset.sha256);
        expect(asset.locales).toEqual(['lo']);
      })();
      void check.catch(() => undefined);
      pending.push(check);
    });
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'lo', url: ADMIN_URL }]);
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: authLo.login.title, exact: true }),
    ).toBeVisible();
    const publicAuth = await runtimeSnapshot(page);
    expect(publicAuth.dateLocales).toEqual([]);
    expect(publicAuth.numberLocales).toEqual([]);
    await Promise.all(pending);
    expect([...loaded]).toEqual([]);
    const summaryResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/v1/admin/fees/summary' && response.ok(),
    );
    const rowsResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/v1/admin/fees' && response.ok(),
    );
    // Attach rejection handlers immediately; failures remain observable when awaited below.
    void summaryResponse.catch(() => undefined);
    void rowsResponse.catch(() => undefined);
    await openEnglish(page, '/fees?i18n=intl#retained-canonical-data');
    const summary = feeSummarySchema.parse(await (await summaryResponse).json());
    const rows = pageSchema(feeRowSchema).parse(await (await rowsResponse).json()).items;
    const witness = rows.find((row) => date(row.joinedAt, 'lo-LA') !== date(row.joinedAt, 'en-US'));
    expect(
      witness,
      'Fixture must contain a date that distinguishes day/month from US fallback',
    ).toBeDefined();
    if (!witness) throw new Error('Missing independent date-order precondition');
    const before = await runtimeSnapshot(page);
    expect(before.dateLocales).toEqual([]);
    expect(before.numberLocales).toEqual([]);
    await selectLocale(page, 'lo');
    const row = page
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: witness.email, exact: true }) });
    await expect(row).toHaveCount(1);
    await row.getByRole('cell').nth(5).scrollIntoViewIfNeeded();
    await expect(row.getByRole('cell').nth(5)).toBeInViewport();
    await expect(row.getByRole('cell').nth(5)).toHaveText(date(witness.joinedAt, 'lo-LA'));
    const revenue = page
      .getByText(feesLo.stats.revenue, { exact: true })
      .locator('..')
      .locator('b');
    await revenue.scrollIntoViewIfNeeded();
    await expect(revenue).toBeInViewport();
    await expect(revenue).toHaveText(money(summary.revenue, 'lo-LA'));
    await guard.settle();
    const after = await runtimeSnapshot(page);
    expect(after.date).toBe(before.date);
    expect(after.number).toBe(before.number);
    expect(after.dateLocales).toEqual(['lo']);
    expect(after.numberLocales).toEqual(['lo']);
    await Promise.all(pending);
    const selectedPaths = assets
      .filter((asset) => asset.locales.includes('lo'))
      .map((asset) => asset.path)
      .sort();
    expect([...loaded].sort()).toEqual(selectedPaths);
    await selectLocale(page, 'en');
    await expect(row.getByRole('cell').nth(5)).toHaveText(date(witness.joinedAt, 'en-GB'));
    await expect(
      page.getByText(feesEn.stats.revenue, { exact: true }).locator('..').locator('b'),
    ).toHaveText(money(summary.revenue, 'en-GB'));
    expect(await runtimeSnapshot(page)).toEqual(after);
    await Promise.all(pending);
    expect([...loaded].sort()).toEqual(selectedPaths);
    expect(new URL(page.url()).search).toBe('?i18n=intl');
    expect(new URL(page.url()).hash).toBe('#retained-canonical-data');
  });
}
