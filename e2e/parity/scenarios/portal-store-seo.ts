import { expect } from '@playwright/test';
import { nav, tap, waitText, resetScroll } from '../steps';
import type { Scenario } from '../types';

/** Keep the old greeting-only measurement unchanged; this new full-page scope exposes all KPIs. */
export const PORTAL_STORE_SEO: Scenario[] = [
  {
    id: 'P-V46-GUEST-KPI',
    name: 'B15 complete store dashboard, independent guest-view KPI',
    start: 'user',
    fullPage: true,
    note: 'D-139 adds an independent public guest counter; D-114 omits prototype-only fake KPIs/activity. Full-page evidence retained for owner review, no masks.',
    steps: async (c) => {
      await nav(c, 'Gian hàng địa phương');
      await tap(c, 'Gian hàng của tôi');
      await waitText(c, /^Xin chào, /);
      if (c.side === 'app')
        await expect(
          c.page.getByText('Lượt khách xem trang công khai (7 ngày)', { exact: true }),
        ).toBeVisible();
      await resetScroll(c);
    },
  },
];
