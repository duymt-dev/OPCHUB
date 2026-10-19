import type { Request, Response } from 'express';
import type { Env } from '@/common/config';
import { forbidden } from '@/common/errors';
import type { ClientInfo } from '../services/token.service';

/** Cookie refresh của một realm — tên + path hẹp riêng (security.md, TIP-V2-202 không dùng chung) */
export interface RefreshCookieSpec {
  name: string;
  path: string;
}

/** Chỉ gửi kèm request tới `/v1/auth/*` (refresh + logout cần đọc) — security.md › path hẹp */
export const MEMBER_COOKIE: RefreshCookieSpec = { name: 'opchub_rt', path: '/v1/auth' };
/** D-62: phiên quản trị — `/v1/admin/auth/*` */
export const ADMIN_COOKIE: RefreshCookieSpec = { name: 'opchub_art', path: '/v1/admin/auth' };
export const REFRESH_COOKIE = MEMBER_COOKIE.name;

export function setRefreshCookie(
  res: Response,
  env: Env,
  token: string,
  expiresAt: Date,
  persistent: boolean,
  spec: RefreshCookieSpec = MEMBER_COOKIE,
): void {
  res.cookie(spec.name, token, {
    httpOnly: true,
    secure: env.REFRESH_COOKIE_SECURE,
    sameSite: 'lax',
    path: spec.path,
    // D-34: không ghi nhớ → cookie phiên (mất khi đóng trình duyệt), server vẫn giới hạn 7 ngày
    ...(persistent ? { expires: expiresAt } : {}),
  });
}

export function clearRefreshCookie(
  res: Response,
  env: Env,
  spec: RefreshCookieSpec = MEMBER_COOKIE,
): void {
  res.clearCookie(spec.name, {
    httpOnly: true,
    secure: env.REFRESH_COOKIE_SECURE,
    sameSite: 'lax',
    path: spec.path,
  });
}

export function readRefreshCookie(
  req: Request,
  spec: RefreshCookieSpec = MEMBER_COOKIE,
): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const v = cookies?.[spec.name];
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
