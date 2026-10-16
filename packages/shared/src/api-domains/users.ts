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

export const userStatusUpdateSchema = z.object({
  status: z.enum(USER_STATUS),
  reason: z.string().trim().max(500).optional(),
});
export type UserStatusUpdate = z.infer<typeof userStatusUpdateSchema>;

export const assignGroupsSchema = z.object({ userIds: idListSchema, groupIds: idListSchema });
export type AssignGroupsRequest = z.infer<typeof assignGroupsSchema>;
export const assignGroupsResponseSchema = z.object({ updated: z.number().int() });

export const userExportSchema = z.object({ userIds: z.array(z.string()).optional() });
