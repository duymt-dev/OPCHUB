import { z } from 'zod';
import { INVESTOR_KINDS } from './investors';

/**
 * Admin "Nhà đầu tư" (D-58 → D-60, Q-G5c-1, AD-08b): SRS §13 `GET /admin/investors?kind&q&page` trả
 * nhà đầu tư đã **gộp** theo người; bổ sung summary + xuất CSV. D-72: danh sách + xuất, không
 * trạng thái kết nối, không trao đổi.
 */

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

/** File CSV server dựng (BOM + tiêu đề tiếng Việt); xuất dữ liệu cá nhân ghi audit_logs */
export const csvFileSchema = z.object({ filename: z.string(), csv: z.string() });
export type CsvFile = z.infer<typeof csvFileSchema>;
