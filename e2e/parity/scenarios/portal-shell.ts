import { onServer, payFee } from '../../server/api';
import {
  choose,
  hit,
  nav,
  press,
  resetScroll,
  tap,
  tapTitle,
  tick,
  type,
  waitText,
} from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Portal P-01 → P-16: Dashboard, topbar, sidebar */

const openNotif = async (c: StepCtx) => {
  await tapTitle(c, 'Thông báo');
  await waitText(c, 'Đánh dấu tất cả đã đọc');
};

/** Đăng ký cá nhân + OTP đúng → về đăng nhập; đăng nhập user → modal mail chào mừng */
const registerThenLogin = async (c: StepCtx) => {
  await tap(c, 'Đăng ký');
  await tap(c, 'Cá nhân');
  await type(c, 'ban@congty.vn', 'test@x.vn');
  // NR-R02: app bắt buộc đồng ý điều khoản → tick ở cả hai bên
  await c.page
    .getByText(/^Tôi xác nhận là người đại diện hợp pháp/)
    .filter({ visible: true })
    .first()
    .click();
  await press(c, 'Đăng ký');
  await c.page.locator('input[inputmode=numeric]').filter({ visible: true }).first().fill('123456');
  await press(c, 'Xác nhận & kích hoạt tài khoản');
  await tick(c, 2_300);
  if (c.side === 'app') {
    // D-30: kích hoạt xong đã có phiên, modal hiện ngay (ở /community). Bấm mục "Dashboard"
    // (sự kiện DOM, nằm dưới lớp phủ) cho cùng nền với prototype; modal thuộc khung app nên
    // vẫn mở (DV-G2a-2)
    await waitText(c, 'Đã gửi email chào mừng');
    if (onServer) {
      // Q-B62-20: API thật chặn /dashboard/live khi chưa đóng phí → đóng phí qua ngân hàng giả,
      // không tải lại trang (modal chào mừng chỉ trả một lần)
      await payFee(c.page, { reload: false });
    }
    await c.page.locator('aside a[href="/dashboard"]').first().dispatchEvent('click');
    await c.page.waitForURL(/\/dashboard$/);
    // API thật: kích hoạt phí tới guard qua outbox (relay ~1 s) → lần tải đầu có thể lỗi; bấm
    // "Thử lại" như người dùng cho tới khi có dữ liệu
    const hero = c.page.getByText('Thành viên đang tham gia hoạt động').first();
    const retry = c.page.getByRole('button', { name: 'Thử lại' });
    for (let i = 0; onServer && i < 10 && !(await hero.isVisible()); i += 1) {
      if (await retry.isVisible()) await retry.dispatchEvent('click');
      await new Promise((r) => setTimeout(r, 1_000));
    }
    await hero.waitFor();
    // prototype: toast kích hoạt đã tắt trong 2,3 giây đăng nhập lại
    await tick(c, 2_300);
    return;
  }
  // Prototype v4: ô đăng nhập là "email hoặc số điện thoại" (type=text)
  await c.page
    .getByPlaceholder('Nhập email hoặc số điện thoại')
    .filter({ visible: true })
    .first()
    .fill('an.nguyen@mediasoft.vn');
  await c.page.locator('input[type=password]').filter({ visible: true }).first().fill('User@2026');
  await press(c, 'Đăng nhập');
  await tick(c, 2_300);
  await waitText(c, 'Đã gửi email chào mừng');
  // Prototype giữ vị trí cuộn của form đăng ký (dài) sang dashboard phía sau modal
  await resetScroll(c);
};

export const PORTAL_SHELL: Scenario[] = [
  { id: 'P-01', name: 'Dashboard', start: 'user', fullPage: true },
  {
    id: 'P-02',
    name: 'Dashboard · chọn thành viên',
    start: 'user',
    unreachable:
      'Prototype v4 Dashboard chỉ còn lời chào + thẻ Hướng dẫn bắt đầu, không còn khối LIVE (REQ-224) nên không có danh sách thành viên đang hoạt động; app giữ khối LIVE (Q-V4-611-1, DV-V4-611-1), hành vi kiểm ở e2e portal-shell.spec',
    fullPage: true,
    steps: (c) => hit(c, 'Somchai Prasert'),
  },
  {
    id: 'P-03',
    name: 'Dashboard · xem thêm tỉnh/thành',
    start: 'user',
    unreachable:
      'Prototype v4 Dashboard chỉ còn lời chào + thẻ Hướng dẫn bắt đầu, không còn khối LIVE (REQ-224) nên không có "Xem thêm N tỉnh/thành"; app giữ khối LIVE (Q-V4-611-1, DV-V4-611-1), hành vi kiểm ở e2e portal-shell.spec',
    fullPage: true,
    steps: async (c) => {
      await tap(c, /^Xem thêm \d+ tỉnh\/thành$/);
      await waitText(c, 'Thu gọn');
    },
  },
  {
    id: 'P-04',
    name: 'Dashboard · lọc LIVE + 8/trang',
    start: 'user',
    unreachable:
      'Prototype v4 Dashboard chỉ còn lời chào + thẻ Hướng dẫn bắt đầu, không còn khối LIVE (REQ-224) nên không có bộ lọc LIVE / cỡ trang; app giữ khối LIVE (Q-V4-611-1, DV-V4-611-1), hành vi kiểm ở e2e portal-shell.spec',
    fullPage: true,
    steps: async (c) => {
      await choose(c, '8 / trang');
      await c.page
        .locator('div,span')
        .filter({ hasText: /^Đang chat$/ })
        .filter({ visible: true })
        .first()
        .click();
    },
  },
  {
    id: 'P-05',
    name: 'Modal mail chào mừng',
    start: 'auth',
    steps: registerThenLogin,
    capture: {
      // Chỉ hộp mail (khung trắng, z 81) — cùng cấu trúc hai bên
      selector: (c) =>
        c.page
          .locator('div')
          .filter({ has: c.page.getByText('Đã gửi email chào mừng', { exact: true }) })
          .filter({ has: c.page.getByText('Quy định hoạt động trên nền tảng', { exact: true }) })
          .last(),
      reason:
        'V4-607 đụng luồng sau đăng ký; nền Dashboard v4 phía sau thuộc V4-611 (prototype v4 đổi Dashboard)',
    },
  },
  {
    id: 'P-06',
    name: 'Dashboard · tham gia thảo luận',
    start: 'user',
    unreachable:
      'Prototype v4 Dashboard chỉ còn lời chào + thẻ Hướng dẫn bắt đầu, không còn khối LIVE (REQ-224) nên không có "Tham gia thảo luận →"; app giữ khối LIVE (Q-V4-611-1, DV-V4-611-1), hành vi kiểm ở e2e portal-shell.spec',
    steps: async (c) => {
      await tap(c, 'Tham gia thảo luận →');
      await waitText(c, 'Enter để gửi');
    },
  },
  { id: 'P-07', name: 'Thông báo', start: 'user', steps: openNotif },
  {
    id: 'P-08',
    name: 'Thông báo · chưa đọc',
    start: 'user',
    steps: async (c) => {
      await openNotif(c);
      await hit(c, 'Chưa đọc (2)');
    },
  },
  {
    id: 'P-09',
    name: 'Thông báo · trống',
    start: 'user',
    steps: async (c) => {
      await openNotif(c);
      await hit(c, 'Đánh dấu tất cả đã đọc');
      await hit(c, 'Chưa đọc (0)');
      await waitText(c, 'Không có thông báo');
    },
  },
  {
    id: 'P-10',
    name: 'Thông báo · mở nhắc tên',
    start: 'user',
    steps: async (c) => {
      await openNotif(c);
      await hit(c, 'Lê Minh Anh nhắc đến bạn trong #Hỏi đáp');
      await waitText(c, 'Enter để gửi');
    },
  },
  {
    id: 'P-11',
    name: 'Topbar · ngôn ngữ',
    start: 'user',
    steps: async (c) => {
      await tap(c, 'Tiếng Việt');
      await waitText(c, 'CHỌN QUỐC GIA & NGÔN NGỮ');
    },
  },
  {
    id: 'P-12',
    name: 'Topbar · menu người dùng',
    start: 'user',
    steps: (c) => c.page.locator('[data-m="me"]').filter({ visible: true }).first().click(),
  },
  {
    id: 'P-13',
    name: 'Sidebar thu gọn',
    start: 'user',
    viewports: [1440],
    fullPage: true,
    steps: (c) => tapTitle(c, 'Thu gọn sidebar'),
  },
  {
    id: 'P-14',
    name: 'Drawer điều hướng',
    start: 'user',
    viewports: [390],
    steps: (c) => tapTitle(c, 'Menu'),
  },
  {
    id: 'P-15',
    name: 'Breadcrumb Trang chủ',
    start: 'user',
    viewports: [1440],
    note: 'Ở 390 topbar ẩn nút Trang chủ',
    fullPage: true,
    steps: async (c) => {
      await nav(c, 'Cộng đồng');
      await tapTitle(c, 'Trang chủ');
      // Prototype v4: Dashboard mở bằng thẻ "Hướng dẫn bắt đầu" (không còn khối LIVE)
      await waitText(c, 'Hướng dẫn bắt đầu');
    },
  },
  {
    id: 'P-16',
    name: 'Sidebar · Sự kiện sắp tới → Xem tất cả',
    start: 'user',
    unreachable:
      'Prototype v4 bỏ khối "Sự kiện sắp tới" ở chân sidebar (thay bằng thẻ gói — P-99).',
  },
  {
    id: 'P-99',
    name: 'Sidebar Portal §27.3 · nhóm menu + thẻ gói',
    start: 'user',
    viewports: [1440],
    note: 'TIP-V4-606 (D-80): chỉ so sidebar; nội dung Dashboard v4 đo ở V4-611/615',
    capture: {
      selector: (c) => c.page.locator('aside').first(),
      reason: 'Màn TIP đụng là sidebar; Dashboard v4 (thẻ Khởi đầu, …) thuộc TIP khác',
    },
  },
  {
    id: 'P-99-DRAWER',
    name: 'Drawer Portal §27.3 · nhóm menu + thẻ gói',
    start: 'user',
    viewports: [390],
    note: 'TIP-V4-606: drawer 390 mở bằng burger',
    steps: (c) => tapTitle(c, 'Menu'),
    capture: {
      selector: (c) => c.page.locator('aside').first(),
      reason: 'Chỉ so drawer điều hướng',
    },
  },
];
