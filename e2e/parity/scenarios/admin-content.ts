import { ADMIN_URL } from '../../urls';
import {
  inCard,
  nav,
  press,
  resetScroll,
  tap,
  tapLast,
  tapTitle,
  tick,
  type,
  waitText,
} from '../steps';
import type { Scenario, StepCtx } from '../types';
import { row, tickRow } from './admin-members';

/** Admin D-42 → D-65: Nội dung & Sự kiện, Dự án, Nhà đầu tư, Dịch vụ */

const MEETUP = 'OPC Meetup #12 – Vận hành doanh nghiệp một mình';
const toEvents = async (c: StepCtx) => {
  await nav(c, 'Nội dung & Sự kiện');
  await waitText(c, 'Tạo sự kiện mới');
};
const openEventForm = async (c: StepCtx) => {
  await toEvents(c);
  await tap(c, /^\+?\s*Tạo sự kiện$/);
  await c.page.getByPlaceholder('VD: OPC Meetup #13').filter({ visible: true }).first().waitFor();
};
const toProjects = async (c: StepCtx) => {
  await nav(c, 'Dự án OPC');
  await waitText(c, 'Kiểm duyệt dự án');
};
/** Prototype v4 mở tab "Đang hiển thị"; app mở "Chờ duyệt" → bấm tab ở prototype (DV-V4-615-5) */
const toPending = async (c: StepCtx) => {
  await toProjects(c);
  if (c.side === 'proto') await tap(c, 'Chờ duyệt');
};
const openReview = async (c: StepCtx) => {
  await toPending(c);
  await inCard(c, 'HalalLink', 'Xem & duyệt');
  await waitText(c, 'Xem & duyệt dự án');
};
const toInvestors = async (c: StepCtx) => {
  await nav(c, 'Nhà đầu tư');
  await waitText(c, 'Quỹ và cá nhân đã bày tỏ quan tâm đầu tư vào các dự án OPC');
};
const toRequests = async (c: StepCtx) => {
  await nav(c, 'Dịch vụ');
  await waitText(c, 'Yêu cầu đăng ký dịch vụ');
};
const openRequest = async (c: StepCtx) => {
  await toRequests(c);
  await row(c, 'YC-1005').getByText('Chi tiết', { exact: true }).click();
  await waitText(c, 'Yêu cầu YC-1005');
};

export const ADMIN_CONTENT: Scenario[] = [
  { id: 'D-42', name: 'Sự kiện · lưới', start: 'admin', fullPage: true, steps: toEvents },
  {
    id: 'D-43',
    name: 'Sự kiện · danh sách',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toEvents(c);
      await tapTitle(c, 'Dạng danh sách');
    },
  },
  {
    id: 'D-44',
    name: 'Sự kiện · Đã đầy → chi tiết sự kiện (Demo Day)',
    start: 'admin',
    fullPage: true,
    note: 'Prototype ver2: bấm nhãn "Đã đầy" mở drawer Chi tiết; app mở cùng drawer qua "Danh sách"',
    steps: async (c) => {
      await toEvents(c);
      if (c.side === 'proto') await tapLast(c, 'Đã đầy');
      else
        await c.page
          .getByRole('button', { name: 'Danh sách', exact: true })
          .filter({ visible: true })
          .nth(3) // thẻ thứ 4 của lưới = Demo Day (cùng thứ tự với prototype)
          .click();
      await waitText(c, 'Check-in tất cả');
    },
  },
  {
    id: 'D-45',
    name: 'Sự kiện · 6/trang',
    start: 'admin',
    fullPage: true,
    note: 'Seed 5 sự kiện → chỉ 1 trang; chụp thanh phân trang mặc định',
    steps: async (c) => {
      await toEvents(c);
      await waitText(c, /Hiển thị 1–5 \/ 5 sự kiện/);
    },
  },
  {
    id: 'D-46',
    name: 'Drawer danh sách đăng ký',
    start: 'admin',
    steps: async (c) => {
      await toEvents(c);
      await inCard(c, MEETUP, 'Danh sách');
      await waitText(c, 'Check-in tất cả');
    },
  },
  { id: 'D-47', name: 'Drawer tạo sự kiện', start: 'admin', steps: openEventForm },
  {
    id: 'D-48',
    name: 'Tạo sự kiện · Online',
    start: 'admin',
    steps: async (c) => {
      await openEventForm(c);
      await tapLast(c, 'Online');
    },
  },
  {
    id: 'D-49',
    name: 'Drawer sửa sự kiện',
    start: 'admin',
    steps: async (c) => {
      await toEvents(c);
      await inCard(c, MEETUP, 'Chỉnh sửa');
      await waitText(c, 'Chỉnh sửa sự kiện');
    },
  },
  {
    id: 'D-50',
    name: 'Sự kiện · chia sẻ',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toEvents(c);
      await inCard(c, MEETUP, 'Chia sẻ');
      await waitText(c, 'Đã sao chép liên kết sự kiện');
    },
  },
  { id: 'D-51', name: 'Dự án · chờ duyệt', start: 'admin', fullPage: true, steps: toPending },
  {
    id: 'D-52',
    name: 'Dự án · Bị từ chối (trống)',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toProjects(c);
      await tap(c, 'Bị từ chối');
      await waitText(c, 'Không có dự án trong mục này.');
    },
  },
  {
    id: 'D-53',
    name: 'Dự án · danh sách',
    start: 'admin',
    unreachable:
      'Prototype v4 Admin › Dự án bỏ nút "Dạng danh sách" (chỉ còn lưới thẻ); app giữ hai dạng (DV-V4-615-5)',
    fullPage: true,
    steps: async (c) => {
      await toProjects(c);
      await tapTitle(c, 'Dạng danh sách');
    },
  },
  {
    id: 'D-54',
    name: 'Dự án · chọn nhiều',
    start: 'admin',
    unreachable:
      'Prototype v4 Admin › Dự án bỏ nút "Dạng danh sách" (chỉ còn lưới thẻ); app giữ hai dạng (DV-V4-615-5)',
    fullPage: true,
    steps: async (c) => {
      await toProjects(c);
      await tapTitle(c, 'Dạng danh sách');
      await tickRow(c, 'HalalLink');
      await tickRow(c, 'EduMate');
      await waitText(c, 'Đã chọn 2 mục');
    },
  },
  { id: 'D-55', name: 'Drawer duyệt dự án', start: 'admin', steps: openReview },
  {
    id: 'D-56',
    name: 'Dự án · đã duyệt',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await openReview(c);
      await press(c, 'Duyệt & xuất bản');
    },
  },
  {
    id: 'D-57',
    name: 'Dự án · Đang hiển thị',
    start: 'admin',
    fullPage: true,
    note: 'Seed ≤ 6 dự án mỗi mục → 1 trang; chụp tab có nhiều dự án nhất',
    steps: async (c) => {
      await toProjects(c);
      await tap(c, 'Đang hiển thị');
    },
  },
  { id: 'D-58', name: 'Nhà đầu tư', start: 'admin', fullPage: true, steps: toInvestors },
  {
    id: 'D-59',
    name: 'Nhà đầu tư · Quỹ',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toInvestors(c);
      await tap(c, /^Quỹ đầu tư\s*2$/);
    },
  },
  {
    id: 'D-60',
    name: 'Drawer nhà đầu tư',
    start: 'admin',
    steps: async (c) => {
      await toInvestors(c);
      await tap(c, 'Chi tiết');
      await waitText(c, 'Thông tin nhà đầu tư');
    },
  },
  { id: 'D-61', name: 'Dịch vụ · yêu cầu', start: 'admin', fullPage: true, steps: toRequests },
  {
    id: 'D-62',
    name: 'Dịch vụ · trống',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toRequests(c);
      await type(c, 'Tìm mã, tên, email, tổ chức...', 'zzzz');
      await waitText(c, 'Không có yêu cầu phù hợp');
    },
  },
  { id: 'D-63', name: 'Drawer yêu cầu YC-1005', start: 'admin', steps: openRequest },
  {
    id: 'D-64',
    name: 'Yêu cầu · từ chối',
    start: 'admin',
    unreachable:
      'D-72 / §27.1 bỏ quy trình 5 bước YC: không còn nút "Từ chối" / "Mở lại tư vấn" (prototype v4 cũng đã bỏ ở drawer)',
  },
  {
    id: 'D-65',
    name: 'Dịch vụ · danh mục',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toRequests(c);
      // prototype v4 đổi tên tab: "Danh mục chương trình & dịch vụ" (cũng là tiêu đề thẻ)
      await tap(c, /^Danh mục chương trình & dịch vụ\s*\d/);
      await waitText(c, /Hiển thị tại User Portal/);
    },
  },
  {
    id: 'D-87',
    name: 'Sự kiện · khối Sắp diễn ra + Tiếp theo (TIP-V2-303)',
    start: 'admin',
    steps: async (c) => {
      await toEvents(c);
      await waitText(c, 'Tiếp theo');
    },
  },
  {
    id: 'D-88',
    name: 'Tạo sự kiện · Link Google Meet (D-59)',
    start: 'admin',
    steps: async (c) => {
      await openEventForm(c);
      await tapLast(c, 'Online');
      await waitText(c, 'Tạo link Meet');
      await c.page
        .getByText('Tạo link Meet')
        .filter({ visible: true })
        .first()
        .scrollIntoViewIfNeeded();
    },
  },
  {
    id: 'D-92',
    name: 'Dự án · Gói Gọi vốn chờ duyệt (chip + Duyệt gọi vốn / Từ chối, V4-610)',
    start: 'user',
    note: 'Thành viên mua Gói Gọi vốn cho OPC Hub Mobile → Admin mở Dự án OPC; prototype là SPA một phiên, app qua cầu cookie MSW (cùng host)',
    capture: {
      selector: (c) =>
        c.side === 'app'
          ? c.page.locator('article').filter({ hasText: 'OPC Hub Mobile' }).first()
          : c.page
              .locator('div')
              .filter({ has: c.page.getByText('OPC Hub Mobile', { exact: true }) })
              .filter({ has: c.page.getByText('Duyệt gọi vốn', { exact: true }) })
              .filter({ has: c.page.getByText('Xóa', { exact: true }) })
              .last(),
      reason: 'Thẻ dự án có chip Gọi vốn (màn TIP V4-610); lưới v4 còn dự án mẫu khác app',
    },
    steps: async (c) => {
      await nav(c, 'Bảng giá');
      await press(c, 'Đăng ký · 15.000.000đ/dự án');
      await press(c, 'Tôi đã chuyển khoản');
      await waitText(c, /^Đã ghi nhận thanh toán/);
      // app: webhook ngân hàng giả (MSW) về sau 2,2 s
      await tick(c, 3_000);
      if (c.side === 'proto') {
        await c.page.locator('[data-m="me"]').filter({ visible: true }).first().click();
        await tap(c, 'Đăng xuất');
        await tick(c, 1_000);
      } else {
        await c.page.goto(`${ADMIN_URL}/login`, { waitUntil: 'load' });
      }
      await c.page
        .locator('input[type=email], input[placeholder="Nhập email hoặc số điện thoại"]')
        .filter({ visible: true })
        .first()
        .fill('admin@opchub.community');
      await c.page
        .locator('input[type=password]')
        .filter({ visible: true })
        .first()
        .fill('Admin@2026');
      await press(c, 'Đăng nhập');
      await tick(c, 2_500);
      await toProjects(c);
      if (c.side === 'app') await tap(c, 'Đang hiển thị');
      await waitText(c, 'Gọi vốn · chờ duyệt');
      // thẻ đầu lưới: về đầu trang để header dính không che thẻ khi chụp
      await resetScroll(c);
    },
  },
];
