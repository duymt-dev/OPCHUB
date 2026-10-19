import { z } from 'zod';
import { PROJECT_STATUS } from '../enums';
import { idListSchema } from './common';
import { PROJECT_REVISION_STATUS, PROJECT_VISIBILITY, projectRepoSchema } from './project-portal';
import { projectItemSchema } from './projects';

/**
 * SRS §13 Projects — phần Admin "Kiểm duyệt dự án" (G5b, D-51 → D-57).
 * Chuyển trạng thái theo SRS §8: Chờ duyệt → Đang hiển thị | Cần chỉnh sửa | Bị từ chối;
 * Đang hiển thị ⇄ Đã ẩn. Endpoint ngoài §13 (bulk, xoá, nổi bật, đếm) ghi ở Q-G5b-1.
 */

export const ADMIN_REVIEW_DECISIONS = [
  'approve',
  'request_changes',
  'reject',
  'hide',
  'republish',
] as const;
export type AdminReviewDecision = (typeof ADMIN_REVIEW_DECISIONS)[number];

export const adminProjectReviewSchema = z
  .object({
    decision: z.enum(ADMIN_REVIEW_DECISIONS),
    note: z.string().trim().max(2000).optional(),
  })
  .refine((v) => !['request_changes', 'reject'].includes(v.decision) || !!v.note, {
    message: 'Cần ghi chú khi yêu cầu chỉnh sửa hoặc từ chối',
    path: ['note'],
  });
export type AdminProjectReview = z.input<typeof adminProjectReviewSchema>;

export const PROJECT_BULK_ACTIONS = ['publish', 'hide', 'delete'] as const;
export type ProjectBulkAction = (typeof PROJECT_BULK_ACTIONS)[number];

export const projectBulkSchema = z.object({
  ids: idListSchema.max(100),
  action: z.enum(PROJECT_BULK_ACTIONS),
});

/** `skipped`: dự án mà trạng thái hiện tại không cho phép thao tác (luật 7) */
export const projectBulkResultSchema = z.object({
  done: z.array(z.string()),
  skipped: z.array(z.string()),
});
export type ProjectBulkResult = z.infer<typeof projectBulkResultSchema>;

export const projectFeatureSchema = z.object({ projectId: z.string().min(1).nullable() });

/**
 * Nội dung bản sửa (REQ-106, D-18) — Admin chỉ xem nội dung bản sửa, không diff (SKIP TIP-V2-113)
 */
export const adminProjectRevisionSchema = projectItemSchema
  .pick({ name: true, category: true, summary: true, stage: true, tags: true, website: true })
  .extend({
    id: z.string(),
    status: z.enum(PROJECT_REVISION_STATUS),
    reviewNote: z.string().nullable(),
    updatedAt: z.string(),
    coverUrl: z.string(),
    description: z.string(),
    testUrl: z.string().nullable(),
    repo: projectRepoSchema.nullable(),
    visibility: z.enum(PROJECT_VISIBILITY),
    team: projectItemSchema.shape.team,
    funding: projectItemSchema.shape.funding,
  });
export type AdminProjectRevision = z.infer<typeof adminProjectRevisionSchema>;

export const adminProjectSchema = projectItemSchema.extend({
  coverUrl: z.string(),
  description: z.string(),
  testUrl: z.string().nullable(),
  repo: projectRepoSchema.nullable(),
  visibility: z.enum(PROJECT_VISIBILITY),
  groupNames: z.array(z.string()),
  /** Dự án nổi bật tuần (chỉ một, chỉ khi đang hiển thị) */
  featured: z.boolean(),
  /** Bản sửa gần nhất chưa áp; `status = pending_review` → hàng "Bản sửa" ở tab Chờ duyệt */
  revision: adminProjectRevisionSchema.nullable().default(null),
});
export type AdminProject = z.infer<typeof adminProjectSchema>;

export const projectCountsSchema = z.record(z.enum(PROJECT_STATUS), z.number().int().min(0));
export type ProjectCounts = z.infer<typeof projectCountsSchema>;
