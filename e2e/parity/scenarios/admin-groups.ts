import { nav, pager, tap, tapLast, tapTitle, tick, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';
import { tickRow } from './admin-members';

/** Admin D-23 → D-41: Nhóm cộng đồng, Kiểm duyệt, Bot tương tác */

const toGroups = async (c: StepCtx) => {
  await nav(c, 'Nhóm cộng đồng');
  await waitText(c, /Hiển thị 1–12 \/ 34 nhóm/);
};
/** Bấm hành động trên thẻ nhóm OPC Hà Nội (thẻ thứ 2 của lưới mặc định) */
const groupAction = async (c: StepCtx, action: string) => {
  await c.page.getByText(action, { exact: true }).filter({ visible: true }).nth(1).click();
};
const toModeration = async (c: StepCtx) => {
  await toGroups(c);
  await tap(c, 'Kiểm duyệt tin nhắn');
  await waitText(c, 'Bộ lọc từ khóa');
};
const openGroupForm = async (c: StepCtx) => {
  await toGroups(c);
  await tap(c, /^\+?\s*Tạo nhóm$/);
  await waitText(c, 'Tạo nhóm cộng đồng mới');
};
const toBots = async (c: StepCtx) => {
  await nav(c, 'Bot tương tác');
  await waitText(c, 'Bot tương tác cộng đồng');
};
const botTab = async (c: StepCtx, tab: string) => {
  await toBots(c);
  await tapLast(c, tab);
};

export const ADMIN_GROUPS: Scenario[] = [
  { id: 'D-23', name: 'Nhóm cộng đồng · lưới', start: 'admin', fullPage: true, steps: toGroups },
  {
    id: 'D-24',
    name: 'Nhóm cộng đồng · danh sách',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toGroups(c);
      await tapTitle(c, 'Dạng danh sách');
    },
  },
  {
    id: 'D-25',
    name: 'Nhóm cộng đồng · Miền Trung',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toGroups(c);
      await tap(c, /^Miền Trung\s*11$/);
    },
  },
  {
    id: 'D-26',
    name: 'Nhóm cộng đồng · chọn nhiều',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toGroups(c);
      await tapTitle(c, 'Dạng danh sách');
      await tickRow(c, 'OPC Hà Nội');
      await tickRow(c, 'OPC Đà Nẵng');
      await waitText(c, 'Đã chọn 2 mục');
    },
  },
  {
    id: 'D-27',
    name: 'Nhóm cộng đồng · trang 2',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toGroups(c);
      await pager(c, 2);
      await waitText(c, /Hiển thị 13–24 \/ 34 nhóm/);
    },
  },
  { id: 'D-28', name: 'Drawer tạo nhóm', start: 'admin', steps: openGroupForm },
  {
    id: 'D-29',
    name: 'Tạo nhóm · báo thiếu tên',
    start: 'admin',
    steps: async (c) => {
      await openGroupForm(c);
      await c.page
        .getByRole('button', { name: 'Tạo nhóm', exact: true })
        .filter({ visible: true })
        .last()
        .click();
      await waitText(c, 'Vui lòng nhập tên nhóm');
    },
  },
  {
    id: 'D-30',
    name: 'Drawer sửa nhóm',
    start: 'admin',
    steps: async (c) => {
      await toGroups(c);
      await groupAction(c, 'Sửa');
      await waitText(c, 'Chỉnh sửa nhóm cộng đồng');
    },
  },
  {
    id: 'D-31',
    name: 'Modal xuất danh sách thành viên',
    start: 'admin',
    steps: async (c) => {
      await toGroups(c);
      await tap(c, 'Xuất dữ liệu');
      await waitText(c, 'Xuất danh sách thành viên nhóm');
    },
  },
  {
    id: 'D-32',
    name: 'Xem chat từ admin (không đổi màn)',
    start: 'admin',
    fullPage: true,
    note: 'Prototype đặt screen=portal, guard trả về admin → vẫn ở Nhóm cộng đồng',
    steps: async (c) => {
      await toGroups(c);
      await groupAction(c, 'Xem chat');
    },
  },
  { id: 'D-33', name: 'Kiểm duyệt tin nhắn', start: 'admin', fullPage: true, steps: toModeration },
  {
    id: 'D-34',
    name: 'Kiểm duyệt · hết tin',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toModeration(c);
      for (let i = 0; i < 4; i += 1) {
        await tap(c, 'Bỏ qua');
        await tick(c, 2_300);
      }
      await waitText(c, 'Không còn tin nhắn nhạy cảm cần xử lý.');
    },
  },
  {
    id: 'D-35',
    name: 'Kiểm duyệt · thêm từ khóa',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toModeration(c);
      await type(c, 'Thêm từ khóa...', 'test');
      await tap(c, 'Thêm');
      await waitText(c, /Đã thêm từ khóa/);
    },
  },
  { id: 'D-36', name: 'Bot · nhật ký tự động', start: 'admin', fullPage: true, steps: toBots },
  {
    id: 'D-37',
    name: 'Bot · Persona',
    start: 'admin',
    fullPage: true,
    steps: (c) => botTab(c, 'Persona'),
  },
  {
    id: 'D-38',
    name: 'Drawer persona',
    start: 'admin',
    steps: async (c) => {
      await botTab(c, 'Persona');
      await tap(c, /Tạo persona/);
      await waitText(c, 'THÔNG TIN CƠ BẢN');
    },
  },
  {
    id: 'D-39',
    name: 'Bot · Kịch bản hội thoại',
    start: 'admin',
    fullPage: true,
    steps: (c) => botTab(c, 'Kịch bản hội thoại'),
  },
  {
    id: 'D-40',
    name: 'Drawer kịch bản',
    start: 'admin',
    steps: async (c) => {
      await botTab(c, 'Kịch bản hội thoại');
      await tap(c, /Tạo kịch bản/);
      await waitText(c, 'XEM TRƯỚC TRONG NHÓM CHAT');
    },
  },
  {
    id: 'D-41',
    name: 'Bot · Hội thoại',
    start: 'admin',
    fullPage: true,
    steps: (c) => botTab(c, 'Hội thoại'),
  },
  {
    id: 'P-01-BOTCARD',
    name: 'Dashboard · thẻ bot (dữ liệu khớp)',
    start: 'user',
    demo: 'bot-history',
    note: 'TIP-V2-560: state đo bổ sung; P-01 giữ nguyên số đo',
    capture: {
      // Khối bao gồm tiêu đề + lưới thẻ (prototype: div, app: section), cùng vùng hai bên
      selector: (c) =>
        c.page
          .locator(c.side === 'proto' ? 'div' : 'section')
          .filter({ has: c.page.getByText('Thảo luận mới trong cộng đồng', { exact: true }) })
          .filter({ has: c.page.getByText('Tham gia thảo luận →').first() })
          .last(),
      reason: 'Chỉ so thẻ bot Dashboard; phần còn lại của P-01 là dữ liệu native thật (DV-V2-P5-2)',
    },
  },
  {
    id: 'D-86',
    name: 'Tạo nhóm · + Thêm chủ đề (NA-09, chỉ quản trị tạo)',
    start: 'admin',
    steps: async (c) => {
      await openGroupForm(c);
      await tap(c, '+ Thêm chủ đề');
    },
  },
];
