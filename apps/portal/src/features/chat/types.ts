import type {
  ChatGroup,
  ChatMessage,
  ChatRoom,
  ReportMessageRequest,
} from '@opchub/shared/api-domains';

export type PanelTab = 'members' | 'files' | 'pins';
export const PANEL_TABS: readonly PanelTab[] = ['members', 'files', 'pins'];

export type ReportReason = ReportMessageRequest['reason'];
export const REPORT_REASONS: readonly ReportReason[] = [
  'spam',
  'scam',
  'abuse',
  'personal_info',
  'other',
];

export interface ReplyTarget {
  id: string;
  name: string;
  text: string;
}

/** Vị trí đang xem: nhóm + phòng đã giải từ URL và dữ liệu */
export interface ChatLocation {
  group: ChatGroup | null;
  room: ChatRoom | null;
  rooms: ChatRoom[];
}

/** Tin đã tính sẵn phần hiển thị (gộp đầu tin liền nhau như prototype) */
export interface MessageView {
  msg: ChatMessage;
  showHead: boolean;
  mine: boolean;
  match: boolean;
}

export type { ChatGroup, ChatMessage, ChatRoom };
