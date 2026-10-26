import { z } from 'zod';
import { USER_STATUS } from '../enums';
import { idListSchema } from './common';

/** SRS §13 Users — PATCH /me, /admin/users/* */

export const updateMeSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(6).max(20),
    avatarUrl: z.string().url().nullable(),
    position: z.string().trim().max(100),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Không có trường nào để cập nhật');
export type UpdateMeRequest = z.infer<typeof updateMeSchema>;

/** V4-612 (D-77/D-83): số ngày khoá Admin chọn — không gửi = khoá không thời hạn (D-55) */
export const LOCK_DAYS = [1, 3, 7, 14, 30] as const;
export const lockDaysSchema = z.union([
  z.literal(1),
  z.literal(3),
  z.literal(7),
  z.literal(14),
  z.literal(30),
]);
export type LockDays = z.infer<typeof lockDaysSchema>;

export const userStatusUpdateSchema = z.object({
  status: z.enum(USER_STATUS),
  reason: z.string().trim().max(500).optional(),
  days: lockDaysSchema.optional(),
});
export type UserStatusUpdate = z.infer<typeof userStatusUpdateSchema>;

/** GR-R01 / D-56: vai trò khi gán — Thành viên hoặc Giảng viên (không phải vai trò hệ thống) */
export const ASSIGN_GROUP_ROLES = ['member', 'lecturer'] as const;
export const assignGroupsSchema = z.object({
  userIds: idListSchema,
  groupIds: idListSchema,
  role: z.enum(ASSIGN_GROUP_ROLES).default('member'),
});
export type AssignGroupsRequest = z.infer<typeof assignGroupsSchema>;
export type AssignGroupsInput = z.input<typeof assignGroupsSchema>;
export const assignGroupsResponseSchema = z.object({ updated: z.number().int() });

export const userExportSchema = z.object({ userIds: z.array(z.string()).optional() });
