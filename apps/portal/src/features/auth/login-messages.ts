import { ApiError } from '@/lib/api-client';

/** Lỗi API đăng nhập → khóa message (D-44: khóa 15 phút sau 5 lần sai; TK bị khóa → 403) */
export function loginErrorKey(e: unknown) {
  if (!(e instanceof ApiError)) return undefined;
  if (e.code === 'RATE_LIMITED') return { key: 'errorRateLimited', raw: e.message } as const;
  if (e.status === 403) return { key: 'errorLocked' } as const;
  if (e.status === 401 || e.status === 400) return { key: 'errorInvalid' } as const;
  return undefined;
}
