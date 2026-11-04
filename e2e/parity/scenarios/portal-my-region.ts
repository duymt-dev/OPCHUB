import type { Scenario } from '../types';
import { nav, tick, waitText } from '../steps';

export const PORTAL_MY_REGION: Scenario[] = [
  {
    id: 'P-V46-REG-BANNER',
    name: 'Portal · GĐ Vùng · Banner',
    start: 'director',
    demo: 'affiliate',
    fullPage: true,
    beforeCapture: async (c) => {
      await c.page.evaluate(() => window.scrollTo(0, 0));
    },
    steps: async (c) => {
      await nav(c, 'Mạng lưới Affiliate');
      await c.page.waitForLoadState('networkidle');
      await tick(c, 1000);
      await waitText(c, 'Bạn là Giám đốc Vùng');
    },
  },
  {
    id: 'P-V46-REG',
    beforeCapture: async (c) => {
      await c.page.evaluate(() => window.scrollTo(0, 0));
    },
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
