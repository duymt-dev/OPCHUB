import type { MembershipFeeStatus } from '@opchub/shared';
import { statusByValidUntil } from './membership-fee.state';

export interface PreAppointmentFee {
  status: MembershipFeeStatus;
  validUntil: Date | null;
}

/**
 * BR-462 / D-120: miễn phí do bổ nhiệm không dừng đồng hồ kỳ phí cũ.
 * Trial còn hạn vẫn là trial; hết hạn (kể cả đúng thời điểm thu hồi) phải thanh toán.
 * Chỉ trả trạng thái: caller giữ NGUYÊN validUntil, paidAt, plan và amount đã lưu.
 */
export function feeStatusAfterRevocation(
  previous: PreAppointmentFee,
  now: Date,
): MembershipFeeStatus {
  const until = previous.validUntil;
  if (!until || !Number.isFinite(until.getTime()) || until.getTime() <= now.getTime()) {
    return 'pending_payment';
  }
  if (previous.status === 'trial') return 'trial';
  // Không biến một khoản chờ thanh toán thành khoản đã trả chỉ vì có hạn dữ liệu cũ.
  if (previous.status === 'pending_payment' || previous.status === 'expired') {
    return 'pending_payment';
  }
  return statusByValidUntil(until, now);
}
