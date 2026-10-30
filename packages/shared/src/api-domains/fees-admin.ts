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
  /** D-94 1A: đang miễn phí 3 tháng (optional cho client cũ) */
  trial: z.number().int().default(0),
  /** D-120: exemption is neither a paid term nor a trial; default for older servers. */
  regional_director: z.number().int().nonnegative().default(0),
  pending_payment: z.number().int(),
  expiring: z.number().int(),
  expired: z.number().int(),
  /** Đã đóng phí còn hiệu lực = active + expiring */
  paid: z.number().int(),
  revenue: z.number().int(),
});
export type FeeSummary = z.infer<typeof feeSummarySchema>;

/** Ghi nhận đã thu cho nhiều thành viên — gia hạn nối tiếp như BR-05 */
export const feeBulkCollectSchema = z.object({ userIds: idListSchema });
export const feeBulkCollectResponseSchema = z.object({ updated: z.number().int() });

/** Xuất CSV các thành viên đã chọn (ghi audit_logs — luật 10) */
export const feeExportSchema = z.object({ userIds: idListSchema });
export const feeExportResponseSchema = z.object({ filename: z.string(), csv: z.string() });
export type FeeExport = z.infer<typeof feeExportResponseSchema>;

/**
 * Q-B15-2 (bổ sung; màn Admin `/fees/transactions` — BUG-014): hàng đợi giao dịch CK không khớp + khớp tay.
 * `GET /admin/fees/transactions?before=` (keyset), `POST /admin/fees/transactions/:id/match`.
 */
export const unmatchedTxnSchema = z.object({
  id: z.string(),
  amount: z.number().int(),
  content: z.string(),
  receivedAt: z.string(),
  reason: z.string().nullable(),
  /** BUG-014: Mã TV đọc được trong nội dung CK (gợi ý khớp tay); client cũ thiếu trường vẫn hợp lệ */
  matchedHint: z.string().nullable().default(null),
  /** D-113 (F3): mã GV đọc được trong nội dung — gợi ý khớp tay vào Gói Gọi vốn */
  fundraisingHint: z.string().nullable().default(null),
});
export type UnmatchedTxn = z.infer<typeof unmatchedTxnSchema>;
export const unmatchedTxnPageSchema = z.object({
  items: z.array(unmatchedTxnSchema),
  nextBefore: z.string().nullable(),
});
export const unmatchedTxnQuerySchema = z.object({
  before: z.iso.datetime().optional(),
  size: z.coerce.number().int().min(1).max(100).catch(20),
});
const matchReason = z.string().trim().min(1).max(500);
/**
 * Khớp tay giao dịch "Cần đối soát": vào phí thành viên (`userId`) hoặc — D-113 (F3) — vào một khoản
 * Gói Gọi vốn đang chờ thanh toán (`fundraisingId`). `kind` thiếu = phí (client cũ).
 */
export const manualMatchSchema = z.union([
  z.object({
    kind: z.literal('fundraising'),
    fundraisingId: z.string().min(1),
    reason: matchReason,
  }),
  z.object({
    kind: z.literal('fee').default('fee'),
    userId: z.string().min(1),
    reason: matchReason,
  }),
]);
export type ManualMatchRequest = z.infer<typeof manualMatchSchema>;
/** Thân request phía client (`kind` của phí có thể bỏ) */
export type ManualMatchBody = z.input<typeof manualMatchSchema>;

/** D-113 (F3): khoản Gói Gọi vốn chờ thanh toán — ô chọn khi khớp tay */
export const pendingFundraisingSchema = z.object({
  id: z.string(),
  code: z.string(),
  projectName: z.string(),
  ownerName: z.string(),
  ownerCode: z.string(),
  amount: z.number().int(),
  createdAt: z.string(),
});
export type PendingFundraising = z.infer<typeof pendingFundraisingSchema>;
export const pendingFundraisingListSchema = z.object({ items: z.array(pendingFundraisingSchema) });
export const pendingFundraisingQuerySchema = z.object({
  q: z.string().trim().max(100).catch(''),
});
