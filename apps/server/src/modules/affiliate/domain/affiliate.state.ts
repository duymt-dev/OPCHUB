import type { AffiliateStatus, CommissionStatus, ReferralStatus } from '@opchub/db';

/** §20.5 máy trạng thái — chuyển chỉ qua đây + UPDATE có điều kiện (luật 7) */
/** D-110: mã luôn hoạt động — không còn tạm dừng theo phí; `paused` chỉ là dữ liệu cũ (migration → active) */
export const AFFILIATE_TRANSITIONS: Record<AffiliateStatus, readonly AffiliateStatus[]> = {
  active: [],
  paused: [],
};

/** D-110: không còn void do đại lý tạm dừng; dòng void cũ vẫn là trạng thái cuối */
export const REFERRAL_TRANSITIONS: Record<ReferralStatus, readonly ReferralStatus[]> = {
  pending: ['converted'],
  converted: [],
  void: [],
};

export const COMMISSION_TRANSITIONS: Record<CommissionStatus, readonly CommissionStatus[]> = {
  recorded: ['paid', 'cancelled'],
  paid: [],
  /** D-110: Admin khôi phục khoản hủy nhầm → Đã ghi nhận (khoản đã chi trả vẫn khoá) */
  cancelled: ['recorded'],
};

export const canAffiliate = (from: AffiliateStatus, to: AffiliateStatus) =>
  AFFILIATE_TRANSITIONS[from].includes(to);
export const canReferral = (from: ReferralStatus, to: ReferralStatus) =>
  REFERRAL_TRANSITIONS[from].includes(to);
export const canCommission = (from: CommissionStatus, to: CommissionStatus) =>
  COMMISSION_TRANSITIONS[from].includes(to);
