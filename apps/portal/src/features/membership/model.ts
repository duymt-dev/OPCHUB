import { isFeeUsable, type MembershipFeeStatus, USABLE_FEE_STATUS } from '@opchub/shared';
import { fmtInt, formatLocale } from '@/i18n/format';

/** list (gói + dịch vụ) → form (tư vấn) → done (phiếu đã gửi); pay = hộp chuyển khoản */
export type PaywallView = 'list' | 'form' | 'done' | 'pay';

/** Logic thuần của phí thành viên (test ở model.spec.ts) */

/**
 * BR-03, BR-TRIAL-04: chưa kích hoạt (hết miễn phí / hết hạn / khoản cũ chờ) → popup bắt buộc. Cùng
 * hàm `isFeeUsable` với server (V-11); `validUntil <= now` coi là hết hạn ngay (D-57 / BUG-018).
 */
export function isMandatory(
  s: MembershipFeeStatus | undefined,
  validUntil: string | null = null,
  now: number = Date.now(),
): boolean {
  if (!s) return false;
  return !isFeeUsable({ status: s, validUntil }, new Date(now));
}

/** Đã kích hoạt theo trạng thái (trial / active / expiring) — đếm ngày theo `planCountdown` */
export const isActive = (s: MembershipFeeStatus | undefined) =>
  !!s && (USABLE_FEE_STATUS as readonly MembershipFeeStatus[]).includes(s);

const DAY_MS = 86_400_000;
/** Còn ≤ 30 ngày → cam + "Gia hạn ngay" (prototype `prBill.soon`, NA-04 T-30) */
const SOON_DAYS = 30;

/**
 * Thẻ gói chân sidebar (prototype `prBill`): số ngày còn lại (làm tròn lên), % thanh còn lại
 * trên 365 ngày (tối thiểu 4%), sắp hết hạn. Chưa kích hoạt → 0.
 */
export function planCountdown(validUntil: string | null, active: boolean, now: number) {
  if (!active || !validUntil) return { active: false, left: 0, pct: 0, soon: false };
  const left = Math.max(0, Math.ceil((Date.parse(validUntil) - now) / DAY_MS));
  const pct = Math.max(4, Math.min(100, Math.round((left / 365) * 100)));
  return { active: true, left, pct, soon: left <= SOON_DAYS };
}

/** Tiền là số nguyên VND (luật 9) → "1.200.000đ" */
export const formatVnd = (n: number) => `${fmtInt(n)}đ`;

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

/** timestamptz → dd/mm/yyyy giờ Việt Nam */
export const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat(formatLocale(), DATE_OPTS).format(new Date(iso)) : '—';

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
