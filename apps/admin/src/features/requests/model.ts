import { formatDate } from '@/i18n/format';
import type { ServiceRequest } from '@opchub/shared/api-domains';

/** Hiển thị: ngày theo giờ VN (luật 9) */

export const vnDate = (iso: string, locale = 'vi') => formatDate(iso, locale);
/** Giờ bình luận như prototype (toLocaleString ngày/tháng + giờ:phút) */
export const commentTime = (iso: string, locale = 'vi') =>
  formatDate(iso, locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

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
