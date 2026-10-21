import type { Request, Response } from 'express';
import type { Env } from '@/common/config';

/** D-64: ràng buộc `state` OAuth với trình duyệt đã bấm nút — path hẹp chỉ tới `/v1/auth/sso/*` */
const SSO_STATE_COOKIE = { name: 'opchub_sso', path: '/v1/auth/sso' } as const;
const MAX_AGE_MS = 10 * 60_000;

const options = (env: Env) => ({
  httpOnly: true,
  secure: env.REFRESH_COOKIE_SECURE,
  // lax: cookie vẫn đi kèm khi Google điều hướng top-level quay về callback
  sameSite: 'lax' as const,
  path: SSO_STATE_COOKIE.path,
});

export function setSsoStateCookie(res: Response, env: Env, state: string): void {
  res.cookie(SSO_STATE_COOKIE.name, state, { ...options(env), maxAge: MAX_AGE_MS });
}

export function clearSsoStateCookie(res: Response, env: Env): void {
  res.clearCookie(SSO_STATE_COOKIE.name, options(env));
}

export function readSsoStateCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const v = cookies?.[SSO_STATE_COOKIE.name];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}
