import { nav, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Admin D-96 → D-97: Thành viên · cột Khởi đầu x/8 + lọc (V4-611, AD-02) */
const toMembers = async (c: StepCtx) => {
  await nav(c, 'Thành viên');
  await waitText(c, /tài khoản$/);
};

export const ADMIN_ONBOARDING: Scenario[] = [
  {
    id: 'D-96',
    name: 'Thành viên · cột Khởi đầu x/8',
    start: 'admin',
    capture: {
      selector: (c) => c.page.locator('[data-m="tbl"]').first(),
      reason:
        'Bảng thành viên (cột Khởi đầu); thanh lọc prototype có 7 ô chọn, app 1 (Q-V4-611-6) → đo ở D-07',
    },
    steps: async (c) => {
      await toMembers(c);
      await waitText(c, /\d\/8/);
    },
  },
  {
    id: 'D-97',
    name: 'Thành viên · lọc Khởi đầu "Chưa hoàn tất"',
    start: 'admin',
    capture: {
      selector: (c) => c.page.locator('[data-m="tbl"]').first(),
      reason: 'Như D-96 sau khi chọn "Chưa hoàn tất"',
    },
    steps: async (c) => {
      await toMembers(c);
      const sel = c.page
        .locator('select')
        .filter({ has: c.page.locator('option', { hasText: 'Chưa hoàn tất' }) })
        .first();
      await sel.selectOption({ label: 'Chưa hoàn tất' });
      await waitText(c, /\d\/8/);
    },
  },
];
