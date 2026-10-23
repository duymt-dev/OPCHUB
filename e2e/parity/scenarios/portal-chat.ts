import { onServer, setGroupOwner } from '../../server/api';
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

/** Portal P-28 → P-48: Chat nhóm */

const PANEL_ON = 'Hiện thành viên, file, ghim';
const PANEL_OFF = 'Ẩn bảng thông tin';
const MSG = 'Chào cả nhà, tuần này ai đi Meetup #12 không? Mình đang gom nhóm đi chung.';

/** Vào chat; ở 1440 bảng thông tin mở sẵn → đóng lại để giống mặc định 390 */
const toChat = async (c: StepCtx, panel = false) => {
  await nav(c, 'Chat nhóm');
  await waitText(c, 'Enter để gửi');
  const open = await c.page.locator(`[title="${PANEL_OFF}"]`).filter({ visible: true }).count();
  if (open && !panel) await tapTitle(c, PANEL_OFF);
  if (!open && panel) await tapTitle(c, PANEL_ON);
};
/** Bấm bong bóng tin của Lê Minh Anh (bản trong luồng tin, không phải banner ghim) */
const selectMsg = async (c: StepCtx) => {
  await toChat(c);
  await tapLast(c, MSG);
  await waitText(c, 'Báo cáo');
};
const openReport = async (c: StepCtx) => {
  await selectMsg(c);
  await tap(c, 'Báo cáo');
  await waitText(c, 'Báo cáo tin nhắn');
};
const panelTab = async (c: StepCtx, tab: string) => {
  await toChat(c, true);
  await tap(c, tab);
};

export const PORTAL_CHAT: Scenario[] = [
  { id: 'P-28', name: 'Chat · phòng mặc định', start: 'user', steps: (c) => toChat(c) },
  {
    id: 'P-29',
    name: 'Chat · đổi chủ đề',
    start: 'user',
    viewports: [1440],
    note: 'Ở 390 danh sách chủ đề bị ẩn (data-m="chlist")',
    steps: async (c) => {
      await toChat(c);
      await tap(c, 'Hỏi đáp thuế & pháp lý');
    },
  },
  {
    id: 'P-30',
    name: 'Chat · đổi nhóm',
    start: 'user',
    steps: async (c) => {
      await toChat(c);
      await tapTitle(c, 'OPC TP. Hồ Chí Minh');
    },
  },
  {
    id: 'P-34',
    name: 'Chat · đã gửi tin',
    start: 'user',
    steps: async (c) => {
      await toChat(c);
      await type(c, 'Nhắn tin trong #Chung...', 'Xin chào');
      await tapTitle(c, 'Gửi');
      await waitText(c, 'Xin chào');
    },
  },
  {
    id: 'P-35',
    name: 'Chat · gợi ý nhắc tên',
    start: 'user',
    steps: async (c) => {
      await toChat(c);
      await tapTitle(c, 'Nhắc tên');
      await waitText(c, 'Nhắc tên thành viên');
    },
  },
  { id: 'P-36', name: 'Chat · chọn tin', start: 'user', steps: selectMsg },
  {
    id: 'P-37',
    name: 'Chat · đang trả lời',
    start: 'user',
    steps: async (c) => {
      await selectMsg(c);
      await tap(c, 'Trả lời');
      await waitText(c, 'Trả lời Lê Minh Anh');
    },
  },
  {
    id: 'P-38',
    name: 'Chat · danh sách ghim',
    start: 'user',
    steps: async (c) => {
      await toChat(c);
      await tap(c, /^1 tin đã ghim/);
      await waitText(c, 'Bỏ ghim');
    },
  },
  {
    id: 'P-39',
    name: 'Chat · tìm trong phòng',
    start: 'user',
    steps: async (c) => {
      await toChat(c);
      await tapTitle(c, 'Tìm trong phòng');
      await type(c, 'Tìm tin nhắn trong phòng này...', 'Meetup');
    },
  },
  {
    id: 'P-40',
    name: 'Chat · bảng Thành viên',
    start: 'user',
    note: 'Ở 390 bảng phủ toàn màn',
    steps: (c) => toChat(c, true),
  },
  {
    id: 'P-41',
    name: 'Chat · duyệt yêu cầu vào nhóm',
    start: 'user',
    unreachable:
      'D-71 / §27.1: chủ nhóm không còn duyệt yêu cầu vào nhóm — bảng Thành viên bỏ mục ' +
      '"Chờ duyệt vào nhóm" (prototype v4 còn mục này, Q-V4-603-1). Bảng Thành viên đo ở P-40.',
  },
  {
    id: 'P-42',
    name: 'Chat · bảng File',
    start: 'user',
    viewports: [1440],
    steps: (c) => panelTab(c, 'File'),
  },
  {
    id: 'P-43',
    name: 'Chat · bảng Đã ghim',
    start: 'user',
    viewports: [1440],
    steps: (c) => panelTab(c, 'Đã ghim (1)'),
  },
  {
    id: 'P-44',
    name: 'Modal báo cáo tin',
    start: 'user',
    steps: async (c) => {
      await openReport(c);
      await press(c, 'Gửi báo cáo');
      await waitText(c, 'Vui lòng chọn lý do');
    },
  },
  {
    id: 'P-45',
    name: 'Chat · đã báo cáo tin',
    start: 'user',
    steps: async (c) => {
      await openReport(c);
      await tap(c, 'Lừa đảo');
      await press(c, 'Gửi báo cáo');
      await waitText(c, 'Bạn đã báo cáo tin này');
    },
  },
  {
    id: 'P-46',
    name: 'Chat · xem trước nhóm chưa tham gia',
    start: 'user',
    steps: async (c) => {
      await toChat(c);
      await tapTitle(c, 'OPC Đà Nẵng');
      await waitText(c, /Bạn chưa là thành viên của nhóm này/);
      // Prototype tự cuộn trang xuống đáy khi mở xem trước (tác dụng phụ của _scroll trong cdu);
      // đưa cả hai bên về đầu trang để so đúng trạng thái giao diện
      await resetScroll(c);
    },
  },
  {
    id: 'P-47',
    name: 'Chat · chưa tham gia nhóm nào',
    start: 'user',
    steps: async (c) => {
      // D-43 / Q-B20-1: An là chủ OPC Hà Nội, OPC Khánh Hòa trên API thật → chuyển chủ trước
      if (c.side === 'app' && onServer) {
        await setGroupOwner('c1', 'm2');
        await setGroupOwner('c6', 'm8');
      }
      await nav(c, 'Cộng đồng');
      await tap(c, 'Đã tham gia');
      for (const g of ['OPC TP. Hồ Chí Minh', 'OPC Hà Nội', 'OPC Khánh Hòa']) {
        await inCard(c, g, 'Rời nhóm');
        await tick(c, 2_300);
      }
      await nav(c, 'Chat nhóm');
      await waitText(c, 'Chỉ thành viên nhóm mới xem và gửi được tin nhắn.');
    },
  },
  {
    id: 'P-48',
    name: 'Chat · tham gia thêm nhóm',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toChat(c);
      await tapTitle(c, 'Tham gia thêm nhóm');
      await waitText(c, 'Khám phá cộng đồng');
    },
  },
];
