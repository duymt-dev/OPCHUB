import { clearToast, inCard, nav, resetScroll, tap, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Portal P-49 → P-54, P-96: Sự kiện sắp tới */

const MEETUP = 'OPC Meetup #12 – Vận hành doanh nghiệp một mình';
const toEvents = async (c: StepCtx) => {
  await nav(c, 'Sự kiện sắp tới');
  await waitText(c, 'SỰ KIỆN NỔI BẬT');
};

export const PORTAL_EVENTS: Scenario[] = [
  { id: 'P-49', name: 'Sự kiện', start: 'user', fullPage: true, steps: toEvents },
  {
    id: 'P-50',
    name: 'Sự kiện · đã đăng ký',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toEvents(c);
      await tap(c, 'Đã đăng ký');
    },
  },
  {
    id: 'P-51',
    name: 'Sự kiện · trống',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toEvents(c);
      await type(c, 'Tìm sự kiện theo tên, địa điểm...', 'zzzz');
      await waitText(c, 'Không có sự kiện phù hợp.');
    },
  },
  {
    id: 'P-52',
    name: 'Chi tiết sự kiện',
    start: 'user',
    steps: async (c) => {
      await toEvents(c);
      await inCard(c, MEETUP, 'Chi tiết');
      await waitText(c, 'Link phòng họp Google Meet hiển thị sau khi bạn đăng ký tham gia.');
      // Prototype: cuộn nền sau modal lúc bấm thẻ không ổn định ở 390 (0,26% ↔ 3,78%) — đưa về đầu
      await resetScroll(c);
    },
  },
  {
    id: 'P-53',
    name: 'Sự kiện · đăng ký e1',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toEvents(c);
      await inCard(c, 'MediaSoft Hub, Hà Nội', 'Đăng ký tham gia');
      await waitText(c, /Đăng ký thành công/);
    },
  },
  {
    id: 'P-54',
    name: 'Sự kiện · hết chỗ',
    start: 'user',
    steps: async (c) => {
      await toEvents(c);
      await inCard(c, 'Demo Day – Dự án cộng đồng Q4', 'Chi tiết');
      await waitText(c, 'Thời gian');
      // Như P-52: vị trí cuộn nền sau modal của prototype không ổn định
      await resetScroll(c);
    },
  },
  {
    id: 'P-96',
    name: 'Chi tiết sự kiện · đã đăng ký (link Meet)',
    start: 'user',
    note: 'TIP-V2-303 / D-59: sự kiện đã đăng ký hiện khối Google Meet + "Vào phòng họp"',
    steps: async (c) => {
      await toEvents(c);
      await inCard(c, 'MediaSoft Hub, Hà Nội', 'Đăng ký tham gia');
      await waitText(c, /Đăng ký thành công/);
      await clearToast(c);
      await inCard(c, MEETUP, 'Chi tiết');
      await waitText(c, 'Vào phòng họp');
      await resetScroll(c);
    },
  },
];
