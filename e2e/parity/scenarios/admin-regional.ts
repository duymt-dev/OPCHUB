import { clearToast, nav, openSettings, tap, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';
import { openAffiliate } from './admin-affiliate-steps';

async function openRegional(c: StepCtx) {
  await openAffiliate(c);
  const tab =
    c.side === 'app'
      ? c.page.getByRole('tab', { name: 'Cấu hình GĐ Vùng', exact: true })
      : c.page.getByText('Cấu hình GĐ Vùng', { exact: true }).filter({ visible: true }).first();
  await tab.click();
  await waitText(c, 'Cấu hình Giám đốc Vùng');
}

export const ADMIN_REGIONAL: Scenario[] = [
  {
    id: 'D-120-GDV',
    name: 'GĐ Vùng · Sổ chia sẻ',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await openAffiliate(c);
      const tab =
        c.side === 'app'
          ? c.page.getByRole('tab', { name: /^GĐ Vùng/ })
          : c.page.getByText('GĐ Vùng', { exact: true }).filter({ visible: true }).last();
      await tab.click();
      await waitText(c, 'Tổng phần GĐ Vùng');
    },
  },
  {
    id: 'D-120-GDV-OPEN',
    name: 'GĐ Vùng · Khoản ghi nhận Miền Bắc',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await openAffiliate(c);
      const tab =
        c.side === 'app'
          ? c.page.getByRole('tab', { name: /^GĐ Vùng/ })
          : c.page.getByText('GĐ Vùng', { exact: true }).filter({ visible: true }).last();
      await tab.click();
      await waitText(c, 'Tổng phần GĐ Vùng');
      const name =
        c.side === 'app'
          ? c.page.locator('[data-region="north"]').locator('button[aria-expanded]')
          : c.page.getByText('Trần Quốc Bảo', { exact: true }).filter({ visible: true }).last();
      await name.click();
      await waitText(c, 'Khoản ghi nhận cho GĐ Vùng');
    },
  },
  {
    id: 'D-120-GCFG',
    name: 'Cấu hình Giám đốc Vùng',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: openRegional,
  },
  {
    id: 'D-120-GCFG-RO',
    name: 'Cấu hình GĐ Vùng · Kế toán chỉ xem',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await openSettings(c);
      await waitText(c, 'Thông tin nền tảng');
      await tap(c, 'Vai trò & phân quyền');
      await c.page
        .locator('select[title="Xem thử menu theo vai trò"]')
        .filter({ visible: true })
        .first()
        .selectOption({ label: 'Kế toán' });
      await waitText(c, 'Thoát xem thử');
      await clearToast(c);
      await openRegional(c);
      await waitText(c, /Vai trò Kế toán chỉ được xem/);
    },
  },
  {
    id: 'D-78-GDV',
    unreachable:
      'Q-V46-812-2: prototype has no Marketing entry (C-05). Regional mail is verified by admin-regional-mail behavior and regional-director integration tests; no invented prototype image.',
    name: 'Marketing · Email hệ thống GĐ Vùng',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await nav(c, 'Marketing');
      await tap(c, 'Email tự động');
      await waitText(c, 'Email hệ thống · GĐ Vùng');
    },
  },
  {
    id: 'D-18-GDV',
    name: 'Phí · Miễn phí GĐ Vùng',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await nav(c, 'Phí thành viên');
      await waitText(c, 'Phí thành viên hệ thống');
      await c.page
        .getByText(/^Miễn phí · GĐ Vùng\s*3$/)
        .filter({ visible: true })
        .last()
        .click();
    },
  },
];
