import { z } from 'zod';
import { createServiceCommentSchema, serviceCommentSchema, serviceSchema } from './services';

/**
 * Admin "Dịch vụ" (D-61 → D-65, Q-G5c-2): phiếu + ghi chú nội bộ có gắn tên, danh mục (CRUD), xuất CSV.
 * D-72 (V4-605): không trạng thái, không người phụ trách, không thống kê theo trạng thái.
 */

export const serviceRequestFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
});

export const adminServiceSchema = serviceSchema.extend({ requestCount: z.number().int() });
export type AdminService = z.infer<typeof adminServiceSchema>;

/** Dòng mới trong danh mục có thể còn trống tên (prototype "+ Thêm") */
export const serviceUpsertSchema = z.object({
  name: z.string().trim().max(200).default(''),
  model: z.string().trim().max(100).default(''),
  description: z.string().trim().max(500).default(''),
  enabled: z.boolean().default(true),
});
export const servicePatchSchema = z
  .object({
    name: z.string().trim().max(200),
    model: z.string().trim().max(100),
    description: z.string().trim().max(500),
    enabled: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Không có trường nào để cập nhật');

export const adminServiceCommentSchema = serviceCommentSchema.extend({
  mentions: z.array(z.string()),
});
export type AdminServiceComment = z.infer<typeof adminServiceCommentSchema>;
export const createAdminServiceCommentSchema = createServiceCommentSchema.extend({
  mentions: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
});

/** Người gắn tên được trong ghi chú nội bộ (admin có `services.action`, Q-V4-605-1) */
export const staffMemberSchema = z.object({ id: z.string(), name: z.string() });
export type StaffMember = z.infer<typeof staffMemberSchema>;
