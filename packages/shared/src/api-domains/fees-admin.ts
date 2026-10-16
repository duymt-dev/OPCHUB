import { z } from 'zod';
import { idListSchema } from './common';

/**
 * Bổ sung SRS §13 Membership (admin) cho màn Phí thành viên (D-18 → D-22, Q-G4b-1):
 * GET /admin/fees/summary, POST /admin/fees/collect, /admin/fees/remind-all, /admin/fees/export
 */

/** Thẻ thống kê + số trên tab trạng thái; tiền là số nguyên VND */
export const feeSummarySchema = z.object({
  total: z.number().int(),
  active: z.number().int(),
  pending_payment: z.number().int(),
  expiring: z.number().int(),
  expired: z.number().int(),
  /** Đã đóng phí còn hiệu lực = active + expiring */
  paid: z.number().int(),
  revenue: z.number().int(),
  /** Phí một năm (600.000đ) — câu toast "Đã ghi nhận thu …" */
  feeAmount: z.number().int(),
});
export type FeeSummary = z.infer<typeof feeSummarySchema>;

/** Ghi nhận đã thu cho nhiều thành viên — gia hạn nối tiếp như BR-05 */
export const feeBulkCollectSchema = z.object({ userIds: idListSchema });
export const feeBulkCollectResponseSchema = z.object({ updated: z.number().int() });

/** Xuất CSV các thành viên đã chọn (ghi audit_logs — luật 10) */
export const feeExportSchema = z.object({ userIds: idListSchema });
export const feeExportResponseSchema = z.object({ filename: z.string(), csv: z.string() });
export type FeeExport = z.infer<typeof feeExportResponseSchema>;
