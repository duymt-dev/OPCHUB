import { tapTitle, waitText } from '../steps';
import type { Scenario } from '../types';
import { ADMIN_CONTENT } from './admin-content';
import { ADMIN_GROUPS } from './admin-groups';
import { ADMIN_MEMBERS } from './admin-members';
import { ADMIN_AFFILIATE, ADMIN_RBAC } from './admin-rbac';
import { ADMIN_SETTINGS } from './admin-settings';
import { ADMIN_NEEDS } from './admin-needs';
import { ADMIN_REPORTS } from './admin-reports';
import { ADMIN_STORES } from './admin-stores';
import { OVERVIEW_CHART_MASK } from './overview-mask';
import { ADMIN_BOT_SCHEDULE } from './admin-bot-schedule';

/** Admin D-01 → D-89 — chuỗi thao tác theo coding-packs/reports/ui-parity/screens.md */
export const ADMIN_SCENARIOS: Scenario[] = [
  {
    id: 'D-90',
    name: 'Sidebar Admin §27.3 · nhóm menu',
    start: 'admin',
    viewports: [1440],
    note: 'TIP-V4-606 (D-80): chỉ so sidebar; Tổng quan v4 (Luồng hệ thống) đo ở TIP khác',
    capture: {
      selector: (c) => c.page.locator('aside').first(),
      reason: 'Màn TIP đụng là sidebar Admin',
    },
  },
  {
    id: 'D-90-DRAWER',
    name: 'Drawer Admin §27.3',
    start: 'admin',
    viewports: [390],
    steps: (c) => tapTitle(c, 'Menu'),
    capture: {
      selector: (c) => c.page.locator('aside').first(),
      reason: 'Chỉ so drawer điều hướng Admin',
    },
  },
  {
    id: 'D-91',
    name: 'Admin · menu người dùng có Cài đặt hệ thống',
    start: 'admin',
    note: 'TIP-V4-606: Cài đặt chuyển từ sidebar sang menu người dùng (prototype `umSettings`)',
    steps: async (c) => {
      await c.page.locator('[data-m="me"]').filter({ visible: true }).first().click();
      await waitText(c, 'Cài đặt hệ thống');
    },
    capture: {
      // app: role=menu; prototype: hộp 240px chứa "Đăng xuất"
      selector: (c) =>
        c.side === 'app'
          ? c.page.getByRole('menu').first()
          : c.page
              .locator('div[style*="width: 240px"]')
              .filter({ has: c.page.getByText('Đăng xuất', { exact: true }) })
              .last(),
      reason: 'Chỉ so hộp menu người dùng',
    },
  },
  {
    id: 'D-01',
    name: 'Admin AppShell · Tổng quan',
    start: 'admin',
    mask: OVERVIEW_CHART_MASK,
  },
  ...ADMIN_MEMBERS,
  ...ADMIN_GROUPS,
  ...ADMIN_BOT_SCHEDULE,
  ...ADMIN_CONTENT,
  ...ADMIN_SETTINGS,
  ...ADMIN_RBAC,
  ...ADMIN_AFFILIATE,
  ...ADMIN_NEEDS,
  ...ADMIN_STORES,
  ...ADMIN_REPORTS,
];
