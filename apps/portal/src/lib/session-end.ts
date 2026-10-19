import { ACCOUNT_LOCKED_MESSAGE } from '@opchub/shared';
import { SESSION_REVOKE_REASONS, type SessionRevokeReason } from '@opchub/shared/socket';
import { useAuthStore } from './auth-store';

type Navigate = (href: string) => void;

let navigate: Navigate | null = null;
let ending = false;

/** Shell đăng ký `router.replace` (chuyển trang không tải lại); chưa đăng ký → tải trang */
export function setSessionEndNavigator(fn: Navigate | null): void {
  navigate = fn;
}

/** `?reason=` của màn đăng nhập — chỉ nhận giá trị đã biết */
export function parseEndReason(v: string | null): SessionRevokeReason | null {
  return SESSION_REVOKE_REASONS.find((r) => r === v) ?? null;
}

/** 403 của guard khi TK bị khoá (NA-16) → lý do `locked`; lỗi khác → null */
export function lockedReasonOf(status: number, message: string): SessionRevokeReason | null {
  return status === 403 && message === ACCOUNT_LOCKED_MESSAGE ? 'locked' : null;
}

/**
 * Phiên bị thu hồi (NA-16, QT-02, NA-28): xoá phiên trong bộ nhớ rồi về `/login?reason=`.
 * Dùng `signOut` (không phải `clear`) để AuthGate không chen `/login?next=…`. Gọi nhiều lần
 * (socket + REST cùng báo) chỉ chuyển trang một lần.
 */
export function endSession(reason: SessionRevokeReason): void {
  if (ending) return;
  ending = true;
  useAuthStore.getState().signOut();
  const href = `/login?reason=${reason}`;
  if (navigate) navigate(href);
  else if (typeof window !== 'undefined') window.location.replace(href);
  queueMicrotask(() => {
    ending = false;
  });
}
