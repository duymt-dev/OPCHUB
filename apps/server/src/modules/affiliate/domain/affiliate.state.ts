import type { AffiliateStatus, CommissionStatus, ReferralStatus } from '@opchub/db';

/** §20.5 máy trạng thái — chuyển chỉ qua đây + UPDATE có điều kiện (luật 7) */
export const AFFILIATE_TRANSITIONS: Record<AffiliateStatus, readonly AffiliateStatus[]> = {
  active: ['paused'],
  paused: ['active'],
};

export const REFERRAL_TRANSITIONS: Record<ReferralStatus, readonly ReferralStatus[]> = {
  pending: ['converted', 'void'],
  converted: [],
  void: [],
};

export const COMMISSION_TRANSITIONS: Record<CommissionStatus, readonly CommissionStatus[]> = {
  recorded: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

export const canAffiliate = (from: AffiliateStatus, to: AffiliateStatus) =>
  AFFILIATE_TRANSITIONS[from].includes(to);
export const canReferral = (from: ReferralStatus, to: ReferralStatus) =>
  REFERRAL_TRANSITIONS[from].includes(to);
export const canCommission = (from: CommissionStatus, to: CommissionStatus) =>
  COMMISSION_TRANSITIONS[from].includes(to);
