import { z } from 'zod';
import { ERROR_CODES } from '../errors';
import { USER_STATUS } from '../enums';
import { meSchema } from './me';

export * from './me';
export * from './admin-auth';

/** Hợp đồng API dùng chung FE/BE — SRS §13, standards/backend/api-conventions.md */

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    fields: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    requestId: z.string().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    size: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
  });

export const loginRequestSchema = z.object({
  identifier: z.string().trim().min(1, 'Vui lòng nhập email hoặc số điện thoại'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  remember: z.boolean().optional(),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  me: meSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

/** D-89 (prototype v4): nhóm tỉnh (34) + nhóm ngành con của nhóm tỉnh (56) */
export const GROUP_KIND = ['province', 'industry'] as const;
export type GroupKind = (typeof GROUP_KIND)[number];

export const groupSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  province: z.string(),
  region: z.string(),
  kind: z.enum(GROUP_KIND),
  /** Nhóm ngành: tên ngành + nhóm tỉnh cha; nhóm tỉnh: null */
  industry: z.string().nullable(),
  parentId: z.string().nullable(),
  memberCount: z.number().int(),
  weeklyActive: z.number().int(),
  description: z.string(),
});
export type GroupSummary = z.infer<typeof groupSummarySchema>;

export const memberRowSchema = z.object({
  id: z.string(),
  accountType: z.enum(['personal', 'business']),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  role: z.string(),
  status: z.enum(USER_STATUS),
  createdAt: z.string(),
  groupIds: z.array(z.string()),
});
export type MemberRow = z.infer<typeof memberRowSchema>;

export const eventSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  mode: z.enum(['online', 'offline']),
  day: z.string(),
  time: z.string(),
  place: z.string(),
  seats: z.number().int(),
  registered: z.number().int(),
  description: z.string(),
});
export type EventSummary = z.infer<typeof eventSummarySchema>;
export * from './auth';
export * from './declaration';
