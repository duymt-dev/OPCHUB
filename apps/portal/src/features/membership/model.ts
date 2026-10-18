import type { MembershipFeeStatus } from '@opchub/shared';

/** list (gói + dịch vụ) → form (tư vấn) → done (phiếu đã gửi); pay = hộp chuyển khoản */
export type PaywallView = 'list' | 'form' | 'done' | 'pay';

/** Logic thuần của phí thành viên (test ở model.spec.ts) */

/**
 * BR-03: chưa thanh toán hoặc hết hạn → popup bắt buộc. D-57 / BUG-018: phí đang hiệu lực mà
 * `validUntil <= now` cũng coi là hết hạn (tab mở qua mốc hết hạn, job chưa đổi trạng thái).
 */
export function isMandatory(
  s: MembershipFeeStatus | undefined,
  validUntil: string | null = null,
  now: number = Date.now(),
): boolean {
  if (s === 'pending_payment' || s === 'expired') return true;
  if ((s === 'active' || s === 'expiring') && validUntil) {
    const until = Date.parse(validUntil);
    return !Number.isNaN(until) && until <= now;
  }
  return false;
}

export const isActive = (s: MembershipFeeStatus | undefined) => s === 'active' || s === 'expiring';

/** Tiền là số nguyên VND (luật 9) → "600.000đ" */
export const formatVnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;

const DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** timestamptz → dd/mm/yyyy giờ Việt Nam */
export const formatDate = (iso: string | null) => (iso ? DATE_FMT.format(new Date(iso)) : '—');

/** "Nguyễn Văn An" → "Văn An" (lời chào của popup) */
export const shortName = (full: string) => full.trim().split(/\s+/).slice(-2).join(' ');

/** Đường dẫn từng bước của hộp (screens.md) */
export const PAYWALL_PATHS = {
  list: '/services',
  form: (svcId: string) => `/services/${encodeURIComponent(svcId)}/request`,
  done: (code: string) => `/services/requests/${encodeURIComponent(code)}`,
  pay: '/membership/pay',
} as const;

/** URL → bước cần mở; null = không phải đường dẫn của hộp */
export function viewOfPath(
  path: string,
): { view: PaywallView; svcId?: string; code?: string } | null {
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (seg[0] === 'membership' && seg[1] === 'pay') return { view: 'pay' };
  if (seg[0] !== 'services') return null;
  if (seg[1] === 'requests' && seg[2]) return { view: 'done', code: seg[2] };
  if (seg[1] && seg[2] === 'request') return { view: 'form', svcId: seg[1] };
  return { view: 'list' };
}

export const isPaywallPath = (path: string) => viewOfPath(path) !== null;
