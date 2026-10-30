import { nav, tap, waitText } from '../steps';
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
];
