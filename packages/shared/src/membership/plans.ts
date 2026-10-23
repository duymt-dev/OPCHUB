import type { AccountType } from '../enums';

/**
 * D-68 (SRS-4.0 §27.1, UP-12): bảng giá thành viên — nguồn duy nhất cho server, mail, MSW, Portal, Admin.
 * Tiền là số nguyên VND (luật 9). Giá tháng / giá niêm yết chỉ để hiển thị, số thu thật là `amount`.
 */
export const MEMBERSHIP_PLAN = ['personal', 'business'] as const;
export type MembershipPlan = (typeof MEMBERSHIP_PLAN)[number];

export interface PlanPrice {
  /** Thu theo năm */
  amount: number;
  /** Giá hiển thị theo tháng = amount / 12 */
  monthly: number;
  /** Giá niêm yết gạch ngang */
  listMonthly: number;
}

export const MEMBERSHIP_PLANS: Readonly<Record<MembershipPlan, PlanPrice>> = {
  personal: { amount: 1_200_000, monthly: 100_000, listMonthly: 200_000 },
  business: { amount: 3_600_000, monthly: 300_000, listMonthly: 500_000 },
};

/** Gói Gọi vốn (UP-11, D-82): theo dự án, 6 tháng; gia hạn giá riêng */
export const FUNDRAISING_PLAN = { amount: 15_000_000, months: 6, renewAmount: 7_500_000 } as const;

/** D-68: gói theo loại TK; Nhà đầu tư không đóng phí (D-14) */
export const planOf = (t: AccountType): MembershipPlan | null =>
  t === 'business' ? 'business' : t === 'personal' ? 'personal' : null;

export const planAmount = (p: MembershipPlan): number => MEMBERSHIP_PLANS[p].amount;

/** "Ưu đãi 50%" = 1 − giá tháng / giá niêm yết */
export const planDiscountPct = (p: PlanPrice): number =>
  Math.round((1 - p.monthly / p.listMonthly) * 100);
