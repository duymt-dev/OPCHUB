import type { MembershipFeeStatus } from '@opchub/shared';
import type { FeeRow } from '@opchub/shared/api-domains';

/** Hiển thị: ngày theo giờ VN (luật 9), tiền VND số nguyên */

const DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});

export const vnDate = (iso: string | null) => (iso ? DATE_FMT.format(new Date(iso)) : '—');

const DATE_TIME_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Ho_Chi_Minh',
});

/** Thời gian nhận giao dịch: "HH:mm dd/mm/yyyy" giờ VN (luật 9) */
export const vnDateTime = (iso: string) => DATE_TIME_FMT.format(new Date(iso));

/** Nút toolbar: số giao dịch trang đầu, "9+" khi còn nhiều hơn */
export const txnBadge = (count: number, cap: number) => (count > cap ? `${cap}+` : String(count));

export const vnd = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

export type FeeTone = 'trial' | 'pending' | 'active' | 'soon' | 'expired' | 'gdv';

/** Màu nhãn trạng thái phí của prototype (FS) — lớp CSS cùng tên */
export const FEE_TONE: Record<MembershipFeeStatus, FeeTone> = {
  regional_director: 'gdv',
  trial: 'trial',
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
