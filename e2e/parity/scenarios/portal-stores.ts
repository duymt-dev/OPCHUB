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
    name: 'Chi tiết gian hàng (HTX Cà phê Hòa Phú)',
    start: 'user',
    note: 'So khung nhìn đầu trang (hero + Giới thiệu + Sản phẩm). Phía dưới prototype là "Đang cần" (V4-609) và "Hình ảnh & Video" / "Reels" (dữ liệu mở rộng FS / EX, Q-V4-608-6) — không làm ở V4-608; app đặt Thông tin liên hệ (REQ-510) sau Sản phẩm (DV-V4-608-2)',
    steps: async (c) => {
      await toExplore(c);
      await tapLast(c, 'HTX Cà phê Hòa Phú');
      await waitText(c, 'Giới thiệu doanh nghiệp');
      await resetScroll(c);
    },
  },
  {
    id: 'P-109',
    name: 'Gian hàng của tôi · form sửa',
    start: 'user',
    fullPage: true,
    note: 'Prototype mở bảng điều khiển số liệu giả trước; app vào thẳng form (bỏ dashboard, Q-V4-608-6) → prototype bấm "Chỉnh sửa"',
    steps: async (c) => {
      await nav(c, 'Gian hàng địa phương');
      await tap(c, 'Gian hàng của tôi');
      if (c.side === 'proto') await press(c, 'Chỉnh sửa gian hàng');
      await waitText(c, 'Mức độ hoàn thiện');
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
