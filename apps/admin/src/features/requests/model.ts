import type { ServiceRequest } from '@opchub/shared/api-domains';

/** Hiển thị: ngày theo giờ VN (luật 9) */

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
