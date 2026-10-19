import type { ErrorCode } from '@opchub/shared';

export interface FieldError {
  path: string;
  message: string;
}

/** HTTP status theo mã lỗi — backend/api-conventions.md */
export const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  MEMBERSHIP_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  OTP_INVALID: 422,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL: 500,
  PASSWORD_CHANGE_REQUIRED: 403,
  TWO_FACTOR_SETUP_REQUIRED: 403,
  WRONG_PORTAL: 403,
  VIEW_ONLY: 403,
  GONE: 410,
};

/** Mã đầu tiên của mỗi status (403 → FORBIDDEN, không phải mã 403 riêng thêm sau) */
const STATUS_TO_CODE: Record<number, ErrorCode> = Object.fromEntries(
  Object.entries(HTTP_STATUS)
    .reverse()
    .map(([code, status]) => [status, code as ErrorCode]),
);

export function codeForStatus(status: number): ErrorCode {
  return STATUS_TO_CODE[status] ?? (status >= 500 ? 'INTERNAL' : 'VALIDATION_ERROR');
}

/** Lỗi nghiệp vụ: domain ném, filter chuyển thành envelope `{ error: {...} }` */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fields?: FieldError[],
    /** Giây chờ cho 429 (`Retry-After`) */
    readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = HTTP_STATUS[code];
  }
}

export const notFound = (message = 'Không tìm thấy') => new AppError('NOT_FOUND', message);
export const forbidden = (message = 'Bạn không có quyền thực hiện thao tác này') =>
  new AppError('FORBIDDEN', message);
export const conflict = (message: string) => new AppError('CONFLICT', message);
export const unauthorized = (message = 'Phiên đăng nhập đã hết hạn') =>
  new AppError('UNAUTHORIZED', message);
