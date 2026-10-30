import { nav, press, resetScroll, tap, tick, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Same seeded incumbent in both UIs; sign in normally rather than changing prototype state. */
async function loginDirector(c: StepCtx) {
  await c.page
    .locator('input[type=email], input[placeholder="Nhập email hoặc số điện thoại"]')
    .filter({ visible: true })
    .first()
    .fill('bao.tran@solobooks.vn');
  await c.page.locator('input[type=password]').filter({ visible: true }).first().fill('User@2026');
  await press(c, 'Đăng nhập');
  await c.page.locator('[data-m="me"]').filter({ visible: true }).first().waitFor();
  await c.page.waitForLoadState('networkidle');
  await tick(c, 2300);
  await resetScroll(c);
}

export const PORTAL_REGIONAL_DIRECTOR: Scenario[] = [
  {
    id: 'P-V46-GDV-SIDEBAR',
    name: 'GĐ Vùng · sidebar trên Dashboard',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await loginDirector(c);
      if (c.vw === 390) {
        await c.page.locator('[title="Menu"]').filter({ visible: true }).first().click();
      }
      await waitText(c, 'Xem bảng giá');
    },
  },
  {
    id: 'P-V46-GDV-BILLING',
    name: 'GĐ Vùng · Hồ sơ · Gói & thanh toán',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await loginDirector(c);
      await c.page.locator('[data-m="me"]').filter({ visible: true }).first().click();
      await tap(c, 'Hồ sơ cá nhân');
      await tap(c, 'Gói & thanh toán');
      await waitText(c, 'Lịch sử thanh toán');
      await resetScroll(c);
    },
  },
  {
    id: 'P-V46-GDV-PRICING',
    name: 'GĐ Vùng · Bảng giá thành viên',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await loginDirector(c);
      await nav(c, 'Bảng giá');
      await waitText(c, 'BẢNG GIÁ THÀNH VIÊN');
      await resetScroll(c);
    },
  },
];
