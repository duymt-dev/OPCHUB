import { clearToast, nav, openSettings, tap, tick, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';
import { OVERVIEW_CHART_MASK } from './overview-mask';

/** Admin D-81 → D-83: phân quyền §21 ver2 (xem thử, chỉ xem, đổi mật khẩu lần đầu) — TIP-V2-307 */

const toRoles = async (c: StepCtx) => {
  await openSettings(c);
  await waitText(c, 'Thông tin nền tảng');
  await tap(c, 'Vai trò & phân quyền');
  await waitText(c, /Super Admin luôn có toàn quyền/);
};

/** RB-R09: chọn vai trò ở "Xem thử menu theo vai trò" (cùng `title` ở hai bên) */
const previewAs = async (c: StepCtx, role: string) => {
  await toRoles(c);
  await c.page
    .locator('select[title="Xem thử menu theo vai trò"]')
    .filter({ visible: true })
    .first()
    .selectOption({ label: role });
  await waitText(c, 'Thoát xem thử');
  await clearToast(c);
};

/** Email TK tạm: cố định trên prototype/MSW (bộ nhớ mỗi trang); server cần duy nhất mỗi lần đo */
const tempEmail = (c: StepCtx) =>
  c.side === 'proto' ? 'ly.bientap@opchub.community' : `ly.bientap.${Date.now()}@opchub.community`;
const TEMP_PWD = 'TamThoi2026';

/** Ver2: "Đăng xuất" nằm trong menu người dùng (`data-m="me"`) ở cả hai bên */
const signOut = async (c: StepCtx) => {
  await c.page.locator('[data-m="me"]').filter({ visible: true }).first().click();
  await tap(c, 'Đăng xuất');
  await clearToast(c);
};

export const ADMIN_RBAC: Scenario[] = [
  {
    id: 'D-81',
    mask: OVERVIEW_CHART_MASK,
    name: 'Xem thử vai trò Kế toán · menu + dải cam (RB-R09, AT-RB02)',
    start: 'admin',
    steps: async (c) => {
      await previewAs(c, 'Kế toán');
      // prototype chuyển về Tổng quan khi chọn; app giữ màn hiện tại → mở Tổng quan cho cùng điểm
      if (c.side === 'app') await nav(c, 'Tổng quan');
      await waitText(c, /với vai trò/);
    },
  },
  {
    id: 'D-82',
    name: 'Chế độ chỉ xem · Giảng viên mở Thành viên (AT-RB03)',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await previewAs(c, 'Giảng viên');
      await nav(c, 'Thành viên');
      await waitText(c, /Chế độ chỉ xem/);
    },
  },
  {
    id: 'D-83',
    name: 'Đổi mật khẩu lần đầu (AT-SEC01, RB-R02)',
    start: 'admin',
    viewports: [1440],
    note: 'Prototype: modal trên màn đăng nhập; app: route /first-password (DV-V2-05)',
    steps: async (c) => {
      const email = tempEmail(c);
      await openSettings(c);
      await tap(c, 'Tài khoản quản trị');
      await tap(c, '+ Tạo tài khoản quản trị');
      if (c.side === 'app') await tick(c, 600);
      await c.page
        .getByPlaceholder('Nguyễn Văn A')
        .filter({ visible: true })
        .first()
        .fill('Lý Biên Tập');
      await c.page
        .getByPlaceholder('ten@opchub.community')
        .filter({ visible: true })
        .first()
        .fill(email);
      await tap(c, 'Biên tập nội dung');
      const pwd =
        c.side === 'proto'
          ? c.page.locator('label').filter({ hasText: 'Mật khẩu tạm' }).locator('input')
          : c.page.getByLabel(/Mật khẩu tạm/);
      await pwd.first().fill(TEMP_PWD);
      await c.page
        .getByRole('button', { name: 'Tạo tài khoản', exact: true })
        .filter({ visible: true })
        .last()
        .click();
      await clearToast(c);
      // hộp thoại antd đóng bằng motion theo đồng hồ (parity dừng đồng hồ) → cho chạy rồi chờ ẩn
      if (c.side === 'app') {
        const dlg = c.page.getByRole('dialog').filter({ visible: true });
        for (let i = 0; i < 20 && (await dlg.count()) > 0; i += 1) await tick(c, 300);
        await dlg.waitFor({ state: 'hidden' });
      }
      await signOut(c);
      await waitText(c, 'Chào mừng trở lại');
      // Prototype v4: ô "email hoặc số điện thoại" không còn type=email
      await c.page
        .locator('input[type=email], input[placeholder="Nhập email hoặc số điện thoại"]')
        .filter({ visible: true })
        .first()
        .fill(email);
      await c.page.locator('input[type=password]').filter({ visible: true }).first().fill(TEMP_PWD);
      await c.page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await waitText(c, 'Đổi mật khẩu lần đầu');
    },
    mask: {
      selector: (c) => [c.page.getByText(/ly\.bientap/).filter({ visible: true })],
      reason: 'Email TK tạm khác nhau mỗi lần đo trên server (cần duy nhất)',
    },
  },
];

export { ADMIN_AFFILIATE } from './admin-affiliate';
