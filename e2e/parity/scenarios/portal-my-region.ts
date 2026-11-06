import type { Scenario } from '../types';
import { nav, tick, waitText } from '../steps';
import { expect } from '@playwright/test';
import type { StepCtx } from '../types';

async function settleRegionScroll(c: StepCtx) {
  // Cancel the tab's smooth scroll before the paused-clock full-page capture.
  await c.page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  expect(await c.page.evaluate(() => window.scrollY)).toBe(0);
}

export const PORTAL_MY_REGION: Scenario[] = [
  {
    id: 'P-V46-REG-BANNER',
    name: 'Portal · GĐ Vùng · Banner',
    start: 'director',
    demo: 'affiliate',
    fullPage: true,
    beforeCapture: settleRegionScroll,
    steps: async (c) => {
      await nav(c, 'Mạng lưới Affiliate');
      await c.page.waitForLoadState('networkidle');
      await tick(c, 1000);
      await waitText(c, 'Bạn là Giám đốc Vùng');
    },
  },
  {
    id: 'P-V46-REG',
    beforeCapture: settleRegionScroll,
    name: 'Portal · Vùng của tôi',
    start: 'director',
    demo: 'affiliate',
    fullPage: true,
    steps: async (c) => {
      await nav(c, 'Mạng lưới Affiliate');
      await c.page.waitForLoadState('networkidle');
      await tick(c, 1000);
      await c.page.getByRole('button', { name: 'Xem Vùng của tôi', exact: true }).click();
      await waitText(c, 'Phần được chia theo năm của khách');
    },
  },
];
