import { z } from 'zod';
import { PROJECT_STAGE, PROJECT_STATUS } from '../enums';

/** SRS §13 Projects — /projects, /me/projects, /projects/:id/comments, /admin/projects/:id/review */

export const projectQuerySchema = z.object({
  cat: z.string().trim().optional(),
  stage: z.enum(PROJECT_STAGE).optional(),
  status: z.enum(PROJECT_STATUS).optional(),
});

export const teamMemberSchema = z.object({
  name: z.string(),
  role: z.string(),
  avatarUrl: z.string().nullable(),
  isOwner: z.boolean(),
});

export const projectFundingSchema = z.object({
  /** Số nguyên theo đơn vị `currency` (VND hoặc USD theo seed) */
  amount: z.number().int(),
  currency: z.enum(['VND', 'USD']),
  equityPercent: z.number(),
  round: z.string(),
  instrument: z.string(),
  endsAt: z.string(),
  minTicket: z.number().int(),
  raised: z.number().int(),
  useOfFunds: z.string(),
});
export type ProjectFunding = z.infer<typeof projectFundingSchema>;

export const projectItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  ownerName: z.string(),
  groupName: z.string(),
  summary: z.string(),
  tone: z.enum(['blue', 'rose', 'green', 'amber', 'violet']),
  status: z.enum(PROJECT_STATUS),
  stage: z.enum(PROJECT_STAGE),
  country: z.string(),
  tags: z.array(z.string()),
  website: z.string().nullable(),
  followers: z.number().int(),
  reviewNote: z.string().nullable(),
  createdAt: z.string(),
  team: z.array(teamMemberSchema),
  funding: projectFundingSchema.nullable(),
});
export type ProjectItem = z.infer<typeof projectItemSchema>;

export const projectUpsertSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(1),
  summary: z.string().trim().min(10).max(300),
  stage: z.enum(PROJECT_STAGE),
  country: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).max(10).default([]),
  website: z.string().url().nullable().optional(),
  shareToGroupIds: z.array(z.string()).default([]),
  submit: z.boolean().default(false),
});
export type ProjectUpsert = z.input<typeof projectUpsertSchema>;

export const COMMENT_TYPES = ['feedback', 'question', 'partnership'] as const;

export const projectCommentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  author: z.object({ name: z.string(), avatarUrl: z.string().nullable(), title: z.string() }),
  type: z.enum(COMMENT_TYPES),
  body: z.string(),
  likes: z.number().int(),
  resolved: z.boolean(),
  createdAt: z.string(),
  replies: z.array(
    z.object({
      author: z.object({ name: z.string(), avatarUrl: z.string().nullable() }),
      body: z.string(),
      isOwner: z.boolean(),
      createdAt: z.string(),
    }),
  ),
});
export type ProjectComment = z.infer<typeof projectCommentSchema>;

export const createCommentSchema = z.object({
  type: z.enum(COMMENT_TYPES),
  body: z.string().trim().min(1).max(2000),
});

export const REVIEW_DECISIONS = ['approve', 'request_changes', 'reject', 'hide'] as const;
export const projectReviewSchema = z
  .object({ decision: z.enum(REVIEW_DECISIONS), note: z.string().trim().max(1000).optional() })
  .refine((v) => v.decision === 'approve' || v.decision === 'hide' || !!v.note, {
    message: 'Cần ghi chú khi yêu cầu chỉnh sửa hoặc từ chối',
    path: ['note'],
  });
