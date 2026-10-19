import type { AdminMe } from '@opchub/shared/api';

/** SEC-R01 trước rồi SEC-R02 (§22.2): phiên hạn chế đi tới màn thiết lập tương ứng */
export function setupRouteOf(me: AdminMe): '/first-password' | '/two-factor' | null {
  if (me.mustChangePassword) return '/first-password';
  if (me.twoFactorRequired) return '/two-factor';
  return null;
}
