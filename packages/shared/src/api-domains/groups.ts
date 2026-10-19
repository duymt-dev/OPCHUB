import { z } from 'zod';
import { groupSummarySchema } from '../api';
import { GROUP_JOIN_MODE, GROUP_MEMBER_STATUS } from '../enums';

/** SRS §13 Groups — /groups/*, /admin/groups/* */

export const groupQuerySchema = z.object({ region: z.string().trim().optional() });

export const groupItemSchema = groupSummarySchema.extend({
  joinMode: z.enum(GROUP_JOIN_MODE),
  /** Trạng thái của người đang gọi; null = chưa liên quan */
  myStatus: z.enum(GROUP_MEMBER_STATUS).nullable(),
  /** BUG-011: ảnh bìa `groups.cover_url`; null → ảnh mặc định tự host (D-36) */
  coverUrl: z.string().nullable(),
  /** BUG-011: ≤ 4 ảnh đại diện thật của thành viên mới nhất (bỏ người chưa có ảnh) */
  avatars: z.array(z.string()).max(4),
});
export type GroupItem = z.infer<typeof groupItemSchema>;

export const joinGroupSchema = z.object({ intro: z.string().trim().max(500).optional() });
export type JoinGroupRequest = z.infer<typeof joinGroupSchema>;

export const joinResultSchema = z.object({
  groupId: z.string(),
  status: z.enum(GROUP_MEMBER_STATUS),
});
export type JoinResult = z.infer<typeof joinResultSchema>;

export const joinRequestSchema = z.object({
  userId: z.string(),
  groupId: z.string(),
  fullName: z.string(),
  avatarUrl: z.string().nullable(),
  intro: z.string(),
  requestedAt: z.string(),
});
export type JoinRequest = z.infer<typeof joinRequestSchema>;

export const JOIN_DECISIONS = ['approve', 'reject'] as const;

export const groupUpsertSchema = z.object({
  name: z.string().trim().min(2).max(100),
  province: z.string().trim().min(1),
  description: z.string().trim().max(1000),
  joinMode: z.enum(GROUP_JOIN_MODE),
});
export type GroupUpsert = z.infer<typeof groupUpsertSchema>;

export const roomSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  description: z.string(),
  isDefault: z.boolean(),
});
export type Room = z.infer<typeof roomSchema>;

export const exportJobSchema = z.object({ jobId: z.string(), status: z.literal('queued') });
export type ExportJob = z.infer<typeof exportJobSchema>;
