import { z } from 'zod';
import {
  createServiceCommentSchema,
  SERVICE_REQUEST_STATUSES,
  serviceCommentSchema,
  serviceSchema,
} from './services';

/**
 * Admin "Dịch vụ" (D-61 → D-65, Q-G5c-2): bổ sung SRS §13 Services — thống kê theo trạng thái,
 * danh mục dịch vụ (CRUD), nhân sự phụ trách, bình luận có gắn tên, ghi chú nội bộ, xuất CSV.
 */

export type ServiceRequestState = (typeof SERVICE_REQUEST_STATUSES)[number];

/**
 * Máy trạng thái phiếu YC (SRS §8 + prototype RQ_NEXT): Mới → Đang tư vấn → Đã báo giá →
 * Đã chốt → Hoàn thành; Từ chối từ Mới / Đang tư vấn / Đã báo giá; mở lại → Đang tư vấn.
 */
export const SERVICE_REQUEST_TRANSITIONS: Record<
  ServiceRequestState,
  readonly ServiceRequestState[]
> = {
  new: ['consulting', 'lost'],
  consulting: ['quoted', 'lost'],
  quoted: ['won', 'lost'],
  won: ['done'],
  lost: ['consulting'],
  done: [],
};

export const canTransitionService = (from: ServiceRequestState, to: ServiceRequestState) =>
  SERVICE_REQUEST_TRANSITIONS[from].includes(to);

/** Bước "tiến" kế tiếp (nút "Chuyển sang: …"); null nếu không còn */
export const NEXT_SERVICE_STATUS: Partial<Record<ServiceRequestState, ServiceRequestState>> = {
  new: 'consulting',
  consulting: 'quoted',
  quoted: 'won',
  won: 'done',
};

export const serviceRequestSummarySchema = z.object({
  total: z.number().int(),
  byStatus: z.record(z.enum(SERVICE_REQUEST_STATUSES), z.number().int()),
});
export type ServiceRequestSummary = z.infer<typeof serviceRequestSummarySchema>;

export const serviceRequestFilterSchema = z.object({
  status: z.enum(SERVICE_REQUEST_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
});

/** Đổi trạng thái có điều kiện: `from` phải khớp trạng thái hiện tại (luật 7) */
export const serviceTransitionSchema = z.object({
  from: z.enum(SERVICE_REQUEST_STATUSES),
  to: z.enum(SERVICE_REQUEST_STATUSES),
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

/** Nhân sự nhận phiếu / được gắn tên trong bình luận */
export const staffMemberSchema = z.object({ id: z.string(), name: z.string() });
export type StaffMember = z.infer<typeof staffMemberSchema>;
