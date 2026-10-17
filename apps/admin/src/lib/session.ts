import { loginResponseSchema } from '@opchub/shared/api';
import { useAuthStore } from './auth-store';
import { env } from './env';

let inflight: Promise<boolean> | null = null;

/**
 * `POST /auth/refresh` bằng cookie httpOnly (path `/v1/auth`) — single-flight: nhiều request 401
 * cùng lúc chỉ refresh một lần (refresh token xoay vòng, gọi song song sẽ bị coi là dùng lại).
 * Thành công → cập nhật phiên trong bộ nhớ; thất bại → `false` (người gọi quyết định đăng xuất).
 */
export function refreshSession(): Promise<boolean> {
  inflight ??= doRefresh().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Request-Id': crypto.randomUUID() },
    });
    if (!res.ok) return false;
    const parsed = loginResponseSchema.safeParse(await res.json());
    if (!parsed.success) return false;
    useAuthStore.getState().setSession(parsed.data.accessToken, parsed.data.me);
    return true;
  } catch {
    return false;
  }
}
