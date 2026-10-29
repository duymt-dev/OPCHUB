import { z } from 'zod';
import type { MembershipPlan } from './plans';

/**
 * D-94 5A (CR-08, REQ-603): Cấu hình bảng giá — nguồn duy nhất cho Bảng giá, thanh toán, đối soát,
 * hoa hồng. Dạng theo prototype v4.2 `_prc(s)`: Cá nhân / Doanh nghiệp (niêm yết tháng, bán năm),
 * Gọi vốn (giá / dự án, gia hạn, thời hạn tháng). Tiền là số nguyên VND (luật 9).
 */
const MAX_VND = 10_000_000_000;
const vnd = z.number().int().min(0).max(MAX_VND);
const sell = vnd.min(1, 'Giá bán không được để trống');
const planPriceSchema = z.object({ list: vnd, y: sell });

export const priceConfigSchema = z.object({
  per: planPriceSchema,
  biz: planPriceSchema,
  fund: z.object({
    p: sell,
    r: sell,
    mo: z.number().int().min(1, 'Thời hạn gói Gọi vốn tối thiểu 1 tháng').max(60),
  }),
});
export type PriceConfig = z.infer<typeof priceConfigSchema>;

/** GET /admin/price-config: kèm `version` để chặn ghi đè khi hai Admin cùng sửa */
export const adminPriceConfigSchema = priceConfigSchema.extend({
  version: z.number().int().min(1),
  updatedAt: z.string(),
});
export type AdminPriceConfig = z.infer<typeof adminPriceConfigSchema>;

/** PUT /admin/price-config */
export const priceConfigSaveSchema = priceConfigSchema.extend({
  version: z.number().int().min(1),
});
export type PriceConfigSave = z.infer<typeof priceConfigSaveSchema>;

const KEY: Record<MembershipPlan, 'per' | 'biz'> = { personal: 'per', business: 'biz' };

/** Giá niêm yết / tháng và giá bán / năm của gói */
export const planPrice = (c: PriceConfig, p: MembershipPlan) => c[KEY[p]];

/** Số thu khi đóng phí năm (`per.y` / `biz.y`, §27.5c) */
export const planAmountOf = (c: PriceConfig, p: MembershipPlan): number => planPrice(c, p).y;

/** §27.2(1): giá hiển thị theo tháng = giá bán năm ÷ 12 (làm tròn đồng) */
export const monthlyOf = (y: number): number => Math.round(y / 12);

/** §27.2(1): % ưu đãi = 1 − giá tháng ÷ giá niêm yết (không âm; niêm yết 0 → 0) */
export const discountPctOf = (list: number, y: number): number =>
  list > 0 ? Math.max(0, Math.round((1 - monthlyOf(y) / list) * 100)) : 0;

/** Cảnh báo prototype: giá bán theo tháng cao hơn giá niêm yết */
export const monthlyAboveList = (list: number, y: number): boolean =>
  list > 0 && monthlyOf(y) > list;

/** D-106: khoản Gọi vốn mới `fund.p`; dự án đã từng gọi vốn (hết hạn) → `fund.r` */
export const fundAmountOf = (c: PriceConfig, renewal: boolean): number =>
  renewal ? c.fund.r : c.fund.p;

/** D-110: hoa hồng Gọi vốn = % × giá gói, làm tròn đến đồng */
export const fundCommissionOf = (amount: number, rate: number): number =>
  Math.round((amount * rate) / 100);
