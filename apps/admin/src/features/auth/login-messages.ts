import { ApiError } from '@/lib/api-client';

/** D-27: 401 kèm `fields[mfaToken]` = mật khẩu đúng, cần bước mã TOTP */
export function mfaTokenOf(e: unknown): string | null {
  if (!(e instanceof ApiError) || e.status !== 401) return null;
  return e.fields.find((f) => f.path === 'mfaToken')?.message ?? null;
}

/** Lỗi API đăng nhập → khóa message (D-44: khóa 15 phút sau 5 lần sai; TK bị khóa → 403) */
export function loginErrorKey(e: unknown) {
  if (!(e instanceof ApiError)) return undefined;
  if (e.code === 'RATE_LIMITED') return { key: 'errorRateLimited', raw: e.message } as const;
  // NA-01, D-62: đúng mật khẩu nhưng TK thuộc cổng kia
  if (e.code === 'WRONG_PORTAL') return { key: 'errorWrongApp' } as const;
  // AT-RB04 (RB-R08): TK quản trị bị khoá → đúng câu server "Tài khoản quản trị đã bị khóa"
  if (e.status === 403) return { key: 'errorLocked', raw: e.message } as const;
  if (e.status === 401 || e.status === 400) return { key: 'errorInvalid' } as const;
  return undefined;
}
