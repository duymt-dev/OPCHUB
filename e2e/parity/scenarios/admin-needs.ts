import { nav, waitText } from '../steps';
import type { Scenario } from '../types';

/** Admin D-95: Nhu cầu địa phương (V4-609, AD-07) */
export const ADMIN_NEEDS: Scenario[] = [
  {
    id: 'D-95',
    name: 'Admin › Nhu cầu địa phương (KPI, chip, bảng)',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await nav(c, 'Nhu cầu địa phương');
      await waitText(c, 'Tổng nhu cầu');
    },
  },
];
