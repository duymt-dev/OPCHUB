import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { expectCompactEmpty } from './helpers/affiliate-empty';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

for (const width of [1440, 390]) {
  test(`D-84-AFF-EMPTY TD-P4-UI-05 agent empty search keeps compact guidance at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.goto(`${ADMIN_URL}/affiliate?tab=aff`);
    await expectCompactEmpty(page, 'Tìm tên, mã giới thiệu, email...', width);
  });
}

test('D-84-AFF D-121 region table keeps readable columns and scrollable actions at 1440px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await page.goto(`${ADMIN_URL}/affiliate?tab=aff`);
  const rows = page.locator('tbody tr[data-row-key]');
  // D-94 3A: every member (66 in AF0, paid or not) is an automatic agent; default page shows ten.
  await expect(page.getByRole('tab', { name: /^Affiliate\s*66$/ })).toBeVisible();
  await expect(rows).toHaveCount(10);
  const fit = await page.evaluate(() => {
    const content = document.querySelector('.ant-table-content');
    if (!content) return null;
    const clipped = [...document.querySelectorAll('tbody tr[data-row-key] > td')].filter((td) => {
      const box = td.getBoundingClientRect();
      return [...td.querySelectorAll('*')].some(
        (el) => el.getBoundingClientRect().right > box.right + 0.5,
      );
    }).length;
    return { overflow: content.scrollWidth - content.clientWidth, clipped };
  });
  expect(fit?.clipped).toBe(0);
  expect(fit?.overflow).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  const first = rows.first();
  const action = first.getByRole('link', { name: 'Xem đối soát', exact: true });
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeInViewport();
  await expect(first.getByText('Tự động', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Hiển thị 1–10 / 66 affiliate' }),
  ).toBeVisible();
});
