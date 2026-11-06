import { nav, press, resetScroll, tap, tapLast, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Portal P-105 → P-110: Gian hàng địa phương (V4-608) */

const SEARCH = 'Tìm doanh nghiệp, sản phẩm, dịch vụ, nhu cầu...';
const toExplore = async (c: StepCtx) => {
  await nav(c, 'Gian hàng địa phương');
  await waitText(c, 'Khám phá doanh nghiệp, sản phẩm và cơ hội kinh doanh địa phương');
  await waitText(c, /\d+ kết quả/);
};

export const PORTAL_STORES: Scenario[] = [
  {
    id: 'P-V46-PUBLIC-CARD',
    name: 'Trang công khai · khối trong trình sửa',
    start: 'user',
    beforeCapture: resetScroll,
    capture: {
      selector: (c) =>
        c.side === 'app'
          ? c.page.locator('[data-block="store-public-card"]')
          : c.page
              .locator('div')
              .filter({ has: c.page.getByText('Trang công khai', { exact: true }) })
              .filter({ has: c.page.getByText('Hiển thị trên Google', { exact: true }) })
              .last(),
      reason:
        'BR-494: complete public-page configuration card, including inputs/actions; no masks.',
    },
    steps: async (c) => {
      await nav(c, 'Gian hàng địa phương');
      await tap(c, 'Gian hàng của tôi');
      await tap(c, 'Chỉnh sửa gian hàng');
      await waitText(c, 'Trang công khai');
    },
  },
  {
    id: 'P-V46-GUEST',
    name: 'Trang khách /g/ · ảnh để owner duyệt',
    start: 'auth',
    unreachable:
      'Prototype has no anonymous /g/ page. Actual desktop/mobile captures are attached by store-public-page.spec.ts; no invented prototype baseline or pixel comparison.',
  },
  {
    id: 'P-108-PROJECT-FORM',
    name: 'Gian hàng của tôi · form đăng dự án điền sẵn',
    start: 'user',
    steps: async (c) => {
      await toExplore(c);
      await tapLast(c, 'Công ty TNHH Giải pháp MediaSoft');
      await tap(c, '+ Đăng dự án OPC');
      await waitText(c, 'Đăng dự án mới');
      // Both navigate to Projects; normalize retained background scroll on both sides.
      await resetScroll(c);
    },
  },
  {
    id: 'P-108-PROJECTS',
    name: 'Gian hàng của tôi · khối Dự án OPC',
    start: 'user',
    capture: {
      selector: (c) =>
        c.side === 'app'
          ? c.page.locator('[data-block="store-projects"]')
          : c.page
              .locator('div')
              .filter({
                has: c.page.getByText('OPC Hub Mobile', { exact: true }),
              })
              .filter({ has: c.page.getByText('Dự án OPC', { exact: true }) })
              .last(),
      reason: 'QT-ST-PJ: đo toàn bộ khối mới gồm nút chủ gian hàng và dự án demo; không mask.',
    },
    steps: async (c) => {
      await toExplore(c);
      await tapLast(c, 'Công ty TNHH Giải pháp MediaSoft');
      await waitText(c, '+ Đăng dự án OPC');
    },
  },
  {
    id: 'P-105',
    name: 'Gian hàng · Khám phá (mặc định)',
    start: 'user',
    fullPage: true,
    note: 'Thẻ bỏ tim / lượt xem / badge "Nổi bật" (không có nguồn dữ liệu, Q-V4-608-5)',
    steps: toExplore,
  },
  {
    id: 'P-106',
    name: 'Khám phá · lọc ô danh mục Thủy sản',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toExplore(c);
      await tap(c, 'Thủy sản');
      await waitText(c, /^[1-9]\d* kết quả$/);
    },
  },
  {
    id: 'P-107',
    name: 'Khám phá · không có kết quả',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toExplore(c);
      await type(c, SEARCH, 'khongtontai');
      await press(c, 'Tìm kiếm');
      await waitText(c, 'Không tìm thấy giải pháp phù hợp.');
    },
  },
  {
    id: 'P-108',
    demo: 'stores',
    name: 'Chi tiết gian hàng (HTX Cà phê Hòa Phú)',
    start: 'user',
    note: 'So khung nhìn đầu trang (hero + Giới thiệu + Sản phẩm). TIP-V42-710: hero dùng logo thật khi có; phía dưới (Tầm nhìn & Sứ mệnh, Đội ngũ, Chứng nhận, Hình ảnh & Video, Reels, Hồ sơ năng lực, "Đang cần" V4-609, Thông tin liên hệ REQ-510 — DV-V4-608-2) đo bằng behavior test, chưa đo parity khung nhìn đầy đủ (lệch tích luỹ theo chiều cao, Q-V42-710-8)',
    steps: async (c) => {
      await toExplore(c);
      await tapLast(c, 'HTX Cà phê Hòa Phú');
      await waitText(c, 'Giới thiệu doanh nghiệp');
      await resetScroll(c);
    },
  },
  {
    id: 'P-109',
    name: 'Gian hàng của tôi · dashboard số thật (lời chào)',
    start: 'user',
    note: 'D-114 S6: app và prototype đều mở dashboard mặc định (bỏ Q-V4-608-6); đo riêng khối chào đầu trang — KPI / "Khách quan tâm" / "Lịch hẹn" / "Hoạt động gần đây" của prototype là số liệu giả không có nguồn dữ liệu thật nên app bỏ (Q-V42-710-3, không so các khối này)',
    capture: {
      selector: (c) =>
        c.page
          .locator('div')
          .filter({ has: c.page.getByText(/^Xin chào, /) })
          .last(),
      reason:
        'Chỉ phần chào đầu trang giống hệt hai bên; KPI/Hoạt động gần đây là số liệu giả đã bỏ theo Q-V42-710-3',
    },
    steps: async (c) => {
      await nav(c, 'Gian hàng địa phương');
      await tap(c, 'Gian hàng của tôi');
      await waitText(c, /^Xin chào, /);
    },
  },
  {
    id: 'P-110',
    name: 'Gian hàng của tôi · chưa đóng phí',
    start: 'unpaid',
    unreachable:
      'Prototype chỉ có TK m1 và luôn coi m1 đã đóng phí (isPaidId → m1); không có TK chưa đóng phí (C-01, như P-87).',
  },
];
