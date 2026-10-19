import { nav, press, tap, tick, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Admin D-66 → D-80: Cài đặt & Phân quyền, Marketing, toast */

const toSettings = async (c: StepCtx) => {
  await nav(c, 'Cài đặt & Phân quyền');
  await waitText(c, 'Thông tin nền tảng');
};
const settingsTab = async (c: StepCtx, tab: string) => {
  await toSettings(c);
  await tap(c, tab);
};
const NO_ENTRY =
  'setPage map tab sso/languages về general và danh sách tab không có mục này (C-05).';

export const ADMIN_SETTINGS: Scenario[] = [
  { id: 'D-66', name: 'Cài đặt · Chung', start: 'admin', fullPage: true, steps: toSettings },
  {
    id: 'D-67',
    name: 'Cài đặt · Danh mục lĩnh vực',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await settingsTab(c, 'Danh mục lĩnh vực');
      await waitText(c, 'Thêm lĩnh vực mới');
    },
  },
  {
    id: 'D-68',
    name: 'Lĩnh vực · đang sửa',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await settingsTab(c, 'Danh mục lĩnh vực');
      await tap(c, 'Sửa');
      await waitText(c, 'Sửa lĩnh vực');
    },
  },
  {
    id: 'D-69',
    name: 'Cài đặt · Vai trò & phân quyền',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await settingsTab(c, 'Vai trò & phân quyền');
      await waitText(c, /Super Admin luôn có toàn quyền/);
      await waitText(c, 'Kiểm duyệt tin nhắn nhạy cảm');
    },
  },
  {
    id: 'D-70',
    name: 'Cài đặt · Email chào mừng',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await settingsTab(c, 'Email chào mừng');
      await waitText(c, 'Tiêu đề email');
    },
  },
  {
    id: 'D-71',
    name: 'Cài đặt · SMTP',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await settingsTab(c, 'Gửi email (SMTP)');
      await waitText(c, /Máy chủ gửi email · Brevo/);
    },
  },
  {
    id: 'D-72',
    name: 'SMTP · lỗi xác thực',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await settingsTab(c, 'Gửi email (SMTP)');
      await type(c, 'xsmtpsib-...', '');
      await press(c, 'Kiểm tra kết nối');
      await waitText(c, /Không xác thực được/);
    },
  },
  {
    id: 'D-73',
    name: 'Cài đặt · Tài khoản quản trị',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await settingsTab(c, 'Tài khoản quản trị');
      await waitText(c, /tài khoản nội bộ có quyền truy cập Admin Dashboard/);
      await waitText(c, 'Ngô Thu Hằng');
    },
  },
  {
    id: 'D-74',
    name: 'Tài khoản quản trị · hộp thoại tạo TK (§21 RB-R02)',
    start: 'admin',
    steps: async (c) => {
      await settingsTab(c, 'Tài khoản quản trị');
      await tap(c, '+ Tạo tài khoản quản trị');
      // antd Modal mở bằng animation — đồng hồ giả đang dừng nên phải cho chạy
      if (c.side === 'app') await tick(c, 600);
      await waitText(c, 'Tạo ngẫu nhiên');
    },
  },
  {
    id: 'D-75',
    name: 'Cài đặt · Nhật ký hoạt động',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await settingsTab(c, 'Nhật ký hoạt động');
      await waitText(c, 'Nhật ký hoạt động quản trị');
    },
  },
  { id: 'D-76', name: 'Cài đặt · SSO', start: 'admin', unreachable: `Panel SSO: ${NO_ENTRY}` },
  {
    id: 'D-77',
    name: 'Cài đặt · Ngôn ngữ',
    start: 'admin',
    unreachable: `Panel ngôn ngữ: ${NO_ENTRY}`,
  },
  {
    id: 'D-78',
    name: 'Marketing',
    start: 'admin',
    unreachable: "Không có mục sidebar cho aTab='marketing' (C-05).",
  },
  {
    id: 'D-79',
    name: 'Modal tạo chiến dịch email',
    start: 'admin',
    unreachable: 'Chỉ mở được từ màn Marketing (D-78) — không có lối vào (C-05).',
  },
  {
    id: 'D-80',
    name: 'Toast toàn cục',
    start: 'admin',
    note: 'Toast mẫu: "Đã lưu phân quyền"',
    steps: async (c) => {
      await settingsTab(c, 'Vai trò & phân quyền');
      // NA-28: app chỉ lưu khi có thay đổi và hỏi xác nhận trước khi áp cho mọi TK của vai trò
      // (DV-G6a-3); prototype `smSave` lưu thẳng không kiểm
      if (c.side === 'app') {
        await c.page.getByRole('checkbox', { name: 'Nhật ký hoạt động — Giảng viên' }).click();
        // ô tick ở cuối bảng → trang cuộn xuống; đưa về đầu như prototype trước khi bấm Lưu
        await c.page.evaluate(() => window.scrollTo(0, 0));
      }
      await press(c, 'Lưu');
      if (c.side === 'app') await press(c, 'Lưu phân quyền');
      await waitText(c, 'Đã lưu phân quyền');
    },
  },
];
