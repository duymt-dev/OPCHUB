import {
  NEXT_SERVICE_STATUS,
  type ServiceRequest,
  type ServiceRequestState,
} from '@opchub/shared/api-domains';
import { REQUEST_ORDER } from './types';

/** Hiển thị: ngày theo giờ VN (luật 9), tiến trình theo máy trạng thái SRS §8 */

const TZ = 'Asia/Ho_Chi_Minh';
const DATE = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: TZ,
});
const AGO = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

export const vnDate = (iso: string) => DATE.format(new Date(iso));
/** Giờ bình luận như prototype (toLocaleString ngày/tháng + giờ:phút) */
export const commentTime = (iso: string) => AGO.format(new Date(iso));

/** Màu nhãn trạng thái (RQ_ST) — lớp CSS cùng tên */
export const STATUS_TONE: Record<ServiceRequestState, string> = {
  new: 'new',
  consulting: 'consult',
  quoted: 'quoted',
  won: 'won',
  lost: 'lost',
  done: 'done',
};

export interface StepView {
  status: ServiceRequestState;
  n: number;
  on: boolean;
}

/** Step bar 1–5: các bước đến trạng thái hiện tại sáng; "Từ chối" thì tắt hết */
export function steps(status: ServiceRequestState): StepView[] {
  const idx = REQUEST_ORDER.indexOf(status);
  return REQUEST_ORDER.map((s, i) => ({ status: s, n: i + 1, on: status !== 'lost' && i <= idx }));
}

/** Nút thao tác của drawer theo trạng thái (prototype rqHasNext / rqCanLost / rqIsLost) */
export function requestActions(status: ServiceRequestState) {
  return {
    next: NEXT_SERVICE_STATUS[status] ?? null,
    canReject: status === 'new' || status === 'consulting' || status === 'quoted',
    canReopen: status === 'lost',
  };
}

/** Chữ cái đầu của từ cuối tên (prototype `ini`) */
export const lastInitial = (name: string) => (name.split(' ').pop() ?? '?').charAt(0) || '?';

/** Màu avatar nhân sự trong bình luận (STAFF của prototype) */
const STAFF_COLOR: Record<string, string> = {
  'Lê Minh Châu': 'c1',
  'Phạm Thu Hà': 'c2',
  'Trần Đức Anh': 'c3',
  'Admin OPC Hub': 'c4',
};
export const staffTone = (name: string) => STAFF_COLOR[name] ?? 'c0';

/** Dòng thông tin thêm theo đối tượng (nghề nghiệp, loại hình, quy mô…) */
export const extraRows = (r: ServiceRequest) =>
  Object.entries(r.details ?? {}).filter(([, v]) => v.trim() !== '');

/** "Có nội dung" của ô soạn HTML (bỏ thẻ, &nbsp;) */
export const hasText = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim().length > 0;
