import type { Scenario } from '../types';

/** Admin D-99: Báo cáo B1/B2/B3 (V4-614, D-78) */
export const ADMIN_REPORTS: Scenario[] = [
  {
    id: 'D-99',
    name: 'Admin › Báo cáo (mẫu B1 / B2 / B3, xem trước, Xuất CSV)',
    start: 'admin',
    unreachable:
      'Prototype v4 không có menu "Báo cáo" (`AG` không có `reports`, §27.9 T15); markup `aReports` dựng trên cây mạng lưới đã gỡ (§24, D-78). Màn theo khung Admin chung, hành vi kiểm ở e2e reports.spec + test:int reporting/report-export (Q-V4-614-1).',
  },
];
