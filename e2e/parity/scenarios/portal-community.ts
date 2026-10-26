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
  await waitText(c, /^Tôi đồng ý tuân thủ nội quy cộng đồng/);
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
      // Prototype v4 có 90 nhóm (DV-V4-603-3), app 34: chờ dòng đếm trang 2, không chờ tổng
      await waitText(c, /Hiển thị 10–18 \/ \d+/);
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
    unreachable:
      'D-71 / §27.1: bỏ duyệt vào nhóm — app không còn popup "Cần duyệt" / "Gửi yêu cầu tham gia". ' +
      'Prototype v4 còn giữ nhánh này cho TK chưa đóng phí (Q-V4-603-1); popup vào ngay đo ở P-23.',
  },
  {
    id: 'P-25',
    name: 'Cộng đồng · chờ duyệt',
    start: 'user',
    unreachable:
      'D-71 / §27.1: không còn trạng thái "Đang chờ duyệt" / "Huỷ yêu cầu" (Q-V4-603-1).',
  },
  {
    id: 'P-26',
    name: 'Cộng đồng · đã tham gia nhóm công khai',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await openJoin(c, 'OPC Đà Nẵng');
      await tap(c, /^Tôi đồng ý tuân thủ nội quy cộng đồng/);
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
