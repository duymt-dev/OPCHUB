import type { MembershipFeeStatus } from '@opchub/shared';
import type { FeeRow } from '@opchub/shared/api-domains';
import { formatCurrency, formatDate } from '@/i18n/format';

/** Hiển thị: ngày theo giờ VN (luật 9), tiền VND số nguyên */

export const vnDate = (iso: string | null, locale = 'vi') => formatDate(iso, locale);

const DATE_TIME_OPTIONS = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
} as const;

/** Thời gian nhận giao dịch: "HH:mm dd/mm/yyyy" giờ VN (luật 9) */
export const vnDateTime = (iso: string, locale = 'vi') =>
  formatDate(iso, locale, DATE_TIME_OPTIONS);

/** Nút toolbar: số giao dịch trang đầu, "9+" khi còn nhiều hơn */
export const txnBadge = (count: number, cap: number) => (count > cap ? `${cap}+` : String(count));

export const vnd = (amount: number, locale = 'vi') => formatCurrency(amount, 'VND', locale);

export type FeeTone = 'trial' | 'pending' | 'active' | 'soon' | 'expired' | 'gdv';

/** Màu nhãn trạng thái phí của prototype (FS) — lớp CSS cùng tên */
export const FEE_TONE: Record<MembershipFeeStatus, FeeTone> = {
  trial: 'trial',
  regional_director: 'gdv',
  pending_payment: 'pending',
  active: 'active',
  expiring: 'soon',
  expired: 'expired',
};

/** Thao tác dòng theo trạng thái (prototype v4.2: canCollect / canRenew / canRemind) */
export function rowActions(status: MembershipFeeStatus) {
  return {
    // Prototype v4.2 `canCollect`: chờ / hết hạn → Ghi nhận đã thu; trial chỉ "Gửi nhắc"
    collect: status === 'pending_payment' || status === 'expired',
    renew: status === 'active' || status === 'expiring',
    remind: status !== 'active' && status !== 'regional_director',
  };
}

/** Prototype nhắc tới email, thiếu email thì tới tên */
export const remindTarget = (r: Pick<FeeRow, 'email' | 'fullName'>) => r.email || r.fullName;
