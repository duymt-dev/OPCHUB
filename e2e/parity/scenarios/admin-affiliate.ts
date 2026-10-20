import { nav, resetScroll, tap, tick, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

async function openAffiliate(c: StepCtx) {
  await nav(c, 'Affiliate');
  await c.page.waitForLoadState('networkidle');
  await tick(c, 1000);
  await c.page
    .getByPlaceholder('Tìm thành viên hoặc affiliate...', { exact: true })
    .waitFor({ state: 'visible' });
}

/** TIP-V2-404: measure the actual default AF0 list, never hide automatic agents for parity. */
export const ADMIN_AFFILIATE: Scenario[] = [
  {
    id: 'D-84',
    name: 'Admin · Affiliate',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: openAffiliate,
  },
  {
    id: 'D-85',
    name: 'Admin · Affiliate · Chi tiết đại lý',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await openAffiliate(c);
      // Prototype tabs are clickable divs; app tabs have the accessible tab role.
      const tab =
        c.side === 'app'
          ? c.page.getByRole('tab', { name: /^Affiliate/ })
          : c.page
              .locator('[data-screen-label="Admin · Affiliate"]')
              .getByText('Affiliate', { exact: true })
              .first();
      await tab.click();
      await type(c, 'Tìm tên, mã giới thiệu, email...', 'HAOPC');
      await tick(c, 400);
      await waitText(c, 'Lê Thu Hà');
      await tap(c, 'Lê Thu Hà');
      await c.page.waitForLoadState('networkidle');
      await tick(c, 1000);
      await waitText(c, 'Đối soát & chi trả theo tháng');
      // Searching the long agent list can leave prototype scroll/sticky header displaced.
      // Normalize both sides to the same top-of-detail position, without masking content.
      await resetScroll(c);
    },
  },
];
