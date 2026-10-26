import { nav, press, tap, tick, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Portal P-111 → P-116: Nhu cầu địa phương (V4-609) */

const toNeeds = async (c: StepCtx) => {
  await nav(c, 'Nhu cầu địa phương');
  await waitText(c, /\d+ nhu cầu đang mở/);
};

export const PORTAL_NEEDS: Scenario[] = [
  {
    id: 'P-111',
    name: 'Nhu cầu · tất cả (mặc định)',
    start: 'user',
    fullPage: true,
    steps: toNeeds,
  },
  {
    id: 'P-112',
    name: 'Nhu cầu · lọc chip "Cần mua"',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toNeeds(c);
      await tap(c, /^Cần mua/);
      await waitText(c, /^4 nhu cầu đang mở$/);
    },
  },
  {
    id: 'P-113',
    name: 'Nhu cầu · không có kết quả',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toNeeds(c);
      await type(c, 'Tìm nhu cầu, sản phẩm, gian hàng...', 'khongtontai');
      // App đẩy chữ lên URL sau 300 ms (debounce) — đồng hồ đang dừng nên phải cho chạy
      await tick(c, 400);
      await waitText(c, 'Chưa có nhu cầu phù hợp bộ lọc.');
    },
  },
  {
    id: 'P-114',
    name: 'Đăng nhu cầu · form',
    start: 'user',
    capture: {
      selector: (c) =>
        c.side === 'app'
          ? c.page.getByRole('dialog', { name: 'Đăng nhu cầu' })
          : c.page
              .locator('div')
              .filter({ has: c.page.getByText('Thông tin nhu cầu', { exact: true }) })
              .filter({ has: c.page.getByText('Thông tin liên hệ', { exact: true }) })
              .filter({ has: c.page.getByRole('button', { name: 'Hủy', exact: true }) })
              .last(),
      reason: 'Popup đăng nhu cầu (màn TIP); danh sách phía sau đo ở P-111',
    },
    steps: async (c) => {
      await toNeeds(c);
      await press(c, 'Đăng nhu cầu');
      await waitText(c, 'hiển thị ngay, không cần Admin duyệt');
    },
  },
  {
    id: 'P-115',
    name: 'Nhu cầu của tôi',
    start: 'user',
    fullPage: true,
    note: 'Đo tab với nhu cầu seed n11 của M1 (không đăng mới: ngày đăng hai bên khác nhau)',
    steps: async (c) => {
      await toNeeds(c);
      await tap(c, 'Nhu cầu của tôi');
      await waitText(c, 'Đóng nhu cầu');
    },
  },
  {
    id: 'P-116',
    name: 'Nhu cầu của tôi · chưa đóng phí',
    start: 'unpaid',
    unreachable:
      'Prototype chỉ có TK m1 và luôn coi m1 đã đóng phí (isPaidId → m1); không có TK chưa đóng phí (C-01, như P-110).',
  },
];
