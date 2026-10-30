import { expect } from '@playwright/test';
import { clearToast, nav, resetScroll, tap, waitText } from '../steps';
import type { Scenario } from '../types';

/** P6 configuration only: revenue sharing / payout belongs to V46-802. */
export const ADMIN_REGIONAL_DIRECTORS: Scenario[] = [
  {
    id: 'D-V46-GDV-CONFIG',
    name: 'GĐ Vùng · ba ô cấu hình mặc định',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await nav(c, 'Mạng lưới Affiliate');
      await tap(c, 'Cấu hình GĐ Vùng');
      await waitText(c, 'Cấu hình Giám đốc Vùng');
      await waitText(c, 'Phạm Thu Hà');
    },
  },
  {
    id: 'D-V46-GDV-UNASSIGNED',
    name: 'GĐ Vùng · bỏ phân công Hà Nội',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await nav(c, 'Mạng lưới Affiliate');
      await tap(c, 'Cấu hình GĐ Vùng');
      await waitText(c, 'Cấu hình Giám đốc Vùng');
      if (c.side === 'app') {
        const north = c.page.getByRole('article', { name: 'Miền Bắc', exact: true });
        const province = north.getByRole('button', { name: 'Hà Nội', exact: true });
        await expect(province).toHaveAttribute('aria-pressed', 'true');
        await province.click();
        await expect(province).toHaveAttribute('aria-pressed', 'false');
        await waitText(c, 'Tỉnh/thành chưa được phân vùng: Hà Nội');
      } else {
        await tap(c, 'Hà Nội');
        await waitText(c, '1 tỉnh chưa có GĐ Vùng phụ trách');
      }
      await clearToast(c);
      await resetScroll(c);
    },
  },
];
