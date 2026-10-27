import { type MembershipPlan, PRICE_CONFIG_TEST } from './price-defaults';

/**
 * Giá mặc định cho test (GOAL V4.2: hằng số giá chỉ được ở migration / seed / test).
 * Bằng dòng `price_configs` sau migrate; test đổi giá phải khôi phục lại giá này.
 */
export const FUNDRAISING_PLAN = {
  amount: PRICE_CONFIG_TEST.fund.p,
  renewAmount: PRICE_CONFIG_TEST.fund.r,
  months: PRICE_CONFIG_TEST.fund.mo,
} as const;

export const planAmount = (p: MembershipPlan): number =>
  p === 'business' ? PRICE_CONFIG_TEST.biz.y : PRICE_CONFIG_TEST.per.y;
