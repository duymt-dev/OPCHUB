/** Mã lỗi API — coding-packs/standards/backend/api-conventions.md */
export const ERROR_CODES = [
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
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Thông điệp 403 khi TK bị khoá (NA-16) — client so khớp để về `/login?reason=locked` */
export const ACCOUNT_LOCKED_MESSAGE = 'Tài khoản đã bị khóa, liên hệ hỗ trợ';
