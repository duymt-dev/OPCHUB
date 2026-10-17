import { onServer, setGroupOwner } from '../../server/api';
import { choose, inCard, nav, pager, tap, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Portal P-17 → P-27: Cộng đồng */

const SEARCH = 'Tìm theo tên, chủ đề hoặc mô tả cộng đồng...';
const toCommunity = async (c: StepCtx) => {
  await nav(c, 'Cộng đồng');
  await waitText(c, 'Khám phá cộng đồng');
};
const openJoin = async (c: StepCtx, group: string) => {
  await toCommunity(c);
  await inCard(c, group, 'Đăng ký tham gia');
  await waitText(c, 'Tôi đồng ý tuân thủ nội quy cộng đồng');
};

export const PORTAL_COMMUNITY: Scenario[] = [
  { id: 'P-17', name: 'Cộng đồng', start: 'user', fullPage: true, steps: toCommunity },
  {
    id: 'P-18',
    name: 'Cộng đồng · tìm kiếm',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toCommunity(c);
      await type(c, SEARCH, 'Đà Nẵng');
    },
  },
  {
    id: 'P-19',
    name: 'Cộng đồng · đã tham gia',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toCommunity(c);
      await tap(c, 'Đã tham gia');
    },
  },
  {
    id: 'P-20',
    name: 'Cộng đồng · khu vực + sắp xếp',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toCommunity(c);
      await tap(c, /^Miền Trung\s*\d+$/);
      await choose(c, 'Tên A–Z');
    },
  },
  {
    id: 'P-21',
    name: 'Cộng đồng · trống',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toCommunity(c);
      await type(c, SEARCH, 'zzzz');
      await waitText(c, 'Không tìm thấy cộng đồng phù hợp');
    },
  },
  {
    id: 'P-22',
    name: 'Cộng đồng · trang 2',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toCommunity(c);
      await pager(c, 2);
      await waitText(c, /Hiển thị 10–18 \/ 34/);
    },
  },
  {
    id: 'P-23',
    name: 'Tham gia · nhóm công khai',
    start: 'user',
    steps: (c) => openJoin(c, 'OPC Đà Nẵng'),
  },
  {
    id: 'P-24',
    name: 'Tham gia · nhóm cần duyệt, chưa đồng ý',
    start: 'user',
    steps: async (c) => {
      await openJoin(c, 'OPC Hải Phòng');
      await tap(c, 'Gửi yêu cầu tham gia');
      await waitText(c, 'Vui lòng đồng ý nội quy cộng đồng');
    },
  },
  {
    id: 'P-25',
    name: 'Cộng đồng · chờ duyệt',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await openJoin(c, 'OPC Hải Phòng');
      await type(c, 'Bạn đang làm gì, mong muốn gì khi tham gia nhóm...', 'Founder freelance');
      await tap(c, 'Tôi đồng ý tuân thủ nội quy cộng đồng');
      await tap(c, 'Gửi yêu cầu tham gia');
      await waitText(c, 'Đang chờ duyệt');
    },
  },
  {
    id: 'P-26',
    name: 'Cộng đồng · đã tham gia nhóm công khai',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await openJoin(c, 'OPC Đà Nẵng');
      await tap(c, 'Tôi đồng ý tuân thủ nội quy cộng đồng');
      await tap(c, 'Tham gia ngay');
      await waitText(c, 'Chào mừng bạn đến với OPC Đà Nẵng!');
    },
  },
  {
    id: 'P-27',
    name: 'Cộng đồng · rời nhóm',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      // D-43 / Q-B20-1: API thật không cho chủ nhóm rời → Admin chuyển chủ OPC Hà Nội trước
      if (c.side === 'app' && onServer) await setGroupOwner('c1', 'm2');
      await toCommunity(c);
      await inCard(c, 'OPC Hà Nội', 'Rời nhóm');
      await waitText(c, 'Đã rời OPC Hà Nội');
    },
  },
];
