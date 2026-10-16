import { inCard, nav, tap, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Portal P-49 → P-54: Sự kiện sắp tới */

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
      await waitText(c, 'Thời gian');
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
    },
  },
];
