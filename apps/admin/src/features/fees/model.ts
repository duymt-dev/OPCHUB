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

export const vnd = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

export type FeeTone = 'pending' | 'active' | 'soon' | 'expired';

/** Màu nhãn trạng thái phí của prototype (FS) — lớp CSS cùng tên */
export const FEE_TONE: Record<MembershipFeeStatus, FeeTone> = {
  pending_payment: 'pending',
  active: 'active',
  expiring: 'soon',
  expired: 'expired',
};

/** Thao tác dòng theo trạng thái (prototype: canCollect / canRenew / canRemind) */
export function rowActions(status: MembershipFeeStatus) {
  return {
    collect: status === 'pending_payment' || status === 'expired',
    renew: status === 'active' || status === 'expiring',
    remind: status !== 'active',
  };
}

/** Prototype nhắc tới email, thiếu email thì tới tên */
export const remindTarget = (r: Pick<FeeRow, 'email' | 'fullName'>) => r.email || r.fullName;
