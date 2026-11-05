/** Mã lỗi API — coding-packs/standards/backend/api-conventions.md */
export const ERROR_CODES = [
  'INTEGRATION_ERROR',
  'RENEWAL_NO_CHANNEL',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'MEMBERSHIP_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'OTP_INVALID',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'INTERNAL',
  /** SEC-R01: phiên Admin hạn chế tới khi đổi mật khẩu tạm (403) */
  'PASSWORD_CHANGE_REQUIRED',
  /** SEC-R02: bật "Yêu cầu 2FA" mà TK chưa thiết lập (403) */
  'TWO_FACTOR_SETUP_REQUIRED',
  /** NA-01, D-62: đúng mật khẩu nhưng TK thuộc cổng kia (403) */
  'WRONG_PORTAL',
  /** RB-R07: vai trò có quyền Xem mục này nhưng không có quyền Thao tác (403) */
  'VIEW_ONLY',
  /** Route cũ đã bỏ (TIP-V2-203: `/admin/roles/permissions`, `/admin/admins*`) — 410 */
  'GONE',
  /** D-117 B5: tệp tải lên bị từ chối (thực thi / đuôi lệch MIME / nội dung lệch kiểu) — 422 */
  'FILE_REJECTED',
] as const;

/** RB-R07 câu chữ prototype */
export const viewOnlyMessage = (roleName: string): string =>
  `Vai trò ${roleName} chỉ có quyền xem mục này`;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Thông điệp 403 khi TK bị khoá (NA-16) — client so khớp để về `/login?reason=locked` */
export const ACCOUNT_LOCKED_MESSAGE = 'Tài khoản đã bị khóa, liên hệ hỗ trợ';

/**
 * V4-612 (§26.6, prototype 6299): TK khoá có hạn — đăng nhập báo ngày mở khoá (giờ Việt Nam).
 * Client nhận diện bằng tiền tố `ACCOUNT_LOCKED_UNTIL_PREFIX` như câu khoá không hạn.
 */
export const ACCOUNT_LOCKED_UNTIL_PREFIX = 'Tài khoản bị khóa đến ';
export function accountLockedUntilMessage(until: Date): string {
  const day = until.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${ACCOUNT_LOCKED_UNTIL_PREFIX}${day} do vi phạm nội quy. Vui lòng liên hệ quản trị viên OPC Hub.`;
}
export const isAccountLockedMessage = (m: string): boolean =>
  m === ACCOUNT_LOCKED_MESSAGE || m.startsWith(ACCOUNT_LOCKED_UNTIL_PREFIX);

/** QT-02: link đặt lại sai / đã dùng / quá 15 phút — Portal & Admin hiện kèm nút gửi lại liên kết */
export const PASSWORD_RESET_INVALID_MESSAGE =
  'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn';

/** QT-02, D-44: mật khẩu yếu (đăng ký / đặt lại / đổi) — server và MSW dùng chung câu chữ */
export const weakPasswordMessage = (min: number): string =>
  `Mật khẩu tối thiểu ${min} ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt`;
