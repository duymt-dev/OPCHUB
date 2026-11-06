import { waitText } from '../steps';
import type { Scenario } from '../types';

/** Portal P-119 → P-120: Dashboard · Hướng dẫn bắt đầu 8 bước (V4-611, UP-04) */
export const PORTAL_ONBOARDING: Scenario[] = [
  {
    id: 'P-119',
    name: 'Dashboard · Hướng dẫn bắt đầu (M1 đã phí)',
    start: 'user',
    demo: 'stores',
    fullPage: true,
    note: 'Same complete Dashboard scope as P01, including need matches; no asymmetric region crop.',
    steps: async (c) => {
      await waitText(c, /Đã xong \d\/8 bước/);
      if (c.side === 'app') await waitText(c, 'Nhu cầu phù hợp với gian hàng của bạn');
    },
  },
  {
    id: 'P-120',
    name: 'Dashboard · Hướng dẫn bắt đầu (chưa đóng phí, bước khoá)',
    start: 'unpaid',
    unreachable:
      'Prototype chỉ có TK m1 và luôn coi m1 đã đóng phí (isPaidId → m1); không có TK chưa đóng phí (C-01, như P-110). Trạng thái khoá kiểm ở unit onboarding-card.spec.',
  },
];
