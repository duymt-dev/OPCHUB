import { waitText } from '../steps';
import type { Scenario } from '../types';

/** Portal P-119 → P-120: Dashboard · Hướng dẫn bắt đầu 8 bước (V4-611, UP-04) */
export const PORTAL_ONBOARDING: Scenario[] = [
  {
    id: 'P-119',
    name: 'Dashboard · Hướng dẫn bắt đầu (M1 đã phí)',
    start: 'user',
    capture: {
      selector: (c) =>
        c.side === 'app'
          ? c.page.locator('[data-screen="onboarding"]')
          : c.page.locator('[data-screen-label="Portal · Dashboard"]'),
      reason:
        'Prototype v4 Dashboard chỉ có lời chào + thẻ; app giữ khối LIVE (REQ-224) phía dưới (Q-V4-611-1) — so vùng lời chào + thẻ',
    },
    steps: (c) => waitText(c, /Đã xong \d\/8 bước/),
  },
  {
    id: 'P-120',
    name: 'Dashboard · Hướng dẫn bắt đầu (chưa đóng phí, bước khoá)',
    start: 'unpaid',
    unreachable:
      'Prototype chỉ có TK m1 và luôn coi m1 đã đóng phí (isPaidId → m1); không có TK chưa đóng phí (C-01, như P-110). Trạng thái khoá kiểm ở unit onboarding-card.spec.',
  },
];
