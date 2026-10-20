import { adminLoginResponseSchema } from '@opchub/shared/api';
import { useAuthStore } from './auth-store';
import { env } from './env';
import { withAdminRefreshLock } from './session-refresh-lock';

let inflight: Promise<boolean> | null = null;

/**
 * `POST /admin/auth/refresh` bằng cookie httpOnly (path `/v1/admin/auth`, D-62) — single-flight: nhiều request 401
 * cùng lúc chỉ refresh một lần (refresh token xoay vòng, gọi song song sẽ bị coi là dùng lại).
 * Thành công → cập nhật phiên trong bộ nhớ; thất bại → `false` (người gọi quyết định đăng xuất).
 */
export function refreshSession(): Promise<boolean> {
  inflight ??= withAdminRefreshLock(doRefresh).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/admin/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Request-Id': crypto.randomUUID() },
    });
    if (!res.ok) return false;
    const parsed = adminLoginResponseSchema.safeParse(await res.json());
    if (!parsed.success) return false;
    useAuthStore.getState().setSession(parsed.data.accessToken, parsed.data.admin);
    return true;
  } catch {
    return false;
  }
}
