import type { Request, Response } from 'express';
import type { Env } from '@/common/config';
import { forbidden } from '@/common/errors';
import type { ClientInfo } from '../services/token.service';

export const REFRESH_COOKIE = 'opchub_rt';
/** Chỉ gửi kèm request tới `/v1/auth/*` (refresh + logout cần đọc) — security.md › path hẹp */
const COOKIE_PATH = '/v1/auth';

export function setRefreshCookie(
  res: Response,
  env: Env,
  token: string,
  expiresAt: Date,
  persistent: boolean,
): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.REFRESH_COOKIE_SECURE,
    sameSite: 'lax',
    path: COOKIE_PATH,
    // D-34: không ghi nhớ → cookie phiên (mất khi đóng trình duyệt), server vẫn giới hạn 7 ngày
    ...(persistent ? { expires: expiresAt } : {}),
  });
}

export function clearRefreshCookie(res: Response, env: Env): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.REFRESH_COOKIE_SECURE,
    sameSite: 'lax',
    path: COOKIE_PATH,
  });
}

export function readRefreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const v = cookies?.[REFRESH_COOKIE];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Origin của `Referer` (URL đầy đủ) — hỏng / không phải http(s) → undefined */
function refererOrigin(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    const u = new URL(referer);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.origin : undefined;
  } catch {
    return undefined;
  }
}

/**
 * security.md + BUG-031: endpoint dùng cookie (refresh, logout) chống CSRF bằng nguồn yêu cầu —
 * có `Origin` → phải thuộc CORS_ORIGINS; thiếu `Origin` → origin của `Referer` phải thuộc
 * whitelist; thiếu cả hai → 403. Trình duyệt luôn gửi `Origin` với POST fetch nên FE không đổi.
 */
export function assertAllowedOrigin(req: Request, env: Env): void {
  const origin = req.headers.origin ?? refererOrigin(req.headers.referer);
  if (origin === undefined || !env.CORS_ORIGINS.includes(origin)) {
    throw forbidden('Nguồn yêu cầu không hợp lệ');
  }
}

export const clientInfo = (req: Request): ClientInfo => ({
  ip: req.ip ?? null,
  userAgent: req.headers['user-agent'] ?? null,
});
