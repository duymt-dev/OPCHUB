import { z } from 'zod';
import { INVESTOR_INTEREST_STATUS } from '../enums';
import { INVESTOR_KINDS } from './investors';

/**
 * Admin "Nhà đầu tư" (D-58 → D-60, Q-G5c-1): SRS §13 `GET /admin/investors?kind&q&page` trả
 * nhà đầu tư đã **gộp** theo người (QT-10 "gộp nhà đầu tư"); bổ sung summary, đổi trạng thái
 * kết nối, trao đổi với nhà đầu tư, xuất CSV.
 */

export type InvestorStatus = (typeof INVESTOR_INTEREST_STATUS)[number];

/** Một lần bày tỏ quan tâm của nhà đầu tư vào một dự án */
export const adminInvestorItemSchema = z.object({
  interestId: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  ownerName: z.string(),
  amount: z.number().int(),
  currency: z.enum(['VND', 'USD']),
  message: z.string(),
  createdAt: z.string(),
});
export type AdminInvestorItem = z.infer<typeof adminInvestorItemSchema>;

export const adminInvestorSchema = z.object({
  /** Khóa ổn định của nhà đầu tư (tên + tổ chức) — dùng trong URL API */
  key: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  kind: z.enum(INVESTOR_KINDS),
  organization: z.string(),
  phone: z.string(),
  /** Tổng vốn quan tâm, số nguyên VND (luật 9) */
  totalAmount: z.number().int(),
  lastAt: z.string(),
  status: z.enum(INVESTOR_INTEREST_STATUS),
  commentCount: z.number().int(),
  items: z.array(adminInvestorItemSchema),
});
export type AdminInvestor = z.infer<typeof adminInvestorSchema>;

export const adminInvestorSummarySchema = z.object({
  total: z.number().int(),
  fund: z.number().int(),
  business: z.number().int(),
  individual: z.number().int(),
  totalAmount: z.number().int(),
});
export type AdminInvestorSummary = z.infer<typeof adminInvestorSummarySchema>;

export const adminInvestorFilterSchema = z.object({
  kind: z.enum(INVESTOR_KINDS).optional(),
  q: z.string().trim().max(100).optional(),
});

export const investorStatusPatchSchema = z.object({ status: z.enum(INVESTOR_INTEREST_STATUS) });

export const investorCommentSchema = z.object({
  id: z.string(),
  authorName: z.string(),
  fromInvestor: z.boolean(),
  body: z.string(),
  createdAt: z.string(),
});
export type InvestorComment = z.infer<typeof investorCommentSchema>;
export const createInvestorCommentSchema = z.object({ body: z.string().trim().min(1).max(2000) });

/** File CSV server dựng (BOM + tiêu đề tiếng Việt); xuất dữ liệu cá nhân ghi audit_logs */
export const csvFileSchema = z.object({ filename: z.string(), csv: z.string() });
export type CsvFile = z.infer<typeof csvFileSchema>;

/**
 * Máy trạng thái "Quan tâm đầu tư" (SRS §8): Đã gửi → Đang trao đổi → Đã kết nối.
 * Prototype cho chọn tự do cả ba bước; giữ như vậy (Q-G5c-3) — chỉ chặn giá trị lạ.
 */
export const INVESTOR_STEPS: readonly InvestorStatus[] = INVESTOR_INTEREST_STATUS;
