import { nav, tap, waitText } from '../steps';
import type { Scenario } from '../types';

/** P7 default dataset, not the optional functional receipt fixture used by behavior tests. */
export const ADMIN_REVENUE_SHARING: Scenario[] = [
  {
    id: 'D-V46-GDV-SHARING',
    name: 'GĐ Vùng · sổ chia sẻ mặc định',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await nav(c, 'Mạng lưới Affiliate');
      if (c.side === 'app') await c.page.getByRole('tab', { name: /^GĐ Vùng/ }).click();
      else await tap(c, 'GĐ Vùng');
      await waitText(c, 'Tổng phần GĐ Vùng');
      await waitText(c, 'Trần Quốc Bảo');
      await c.page.waitForLoadState('networkidle');
    },
  },
];
