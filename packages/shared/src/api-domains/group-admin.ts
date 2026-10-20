import { z } from 'zod';
import { USER_STATUS } from '../enums';
import { groupItemSchema, groupUpsertSchema } from './groups';

/**
 * SRS §13 Groups (admin) — phần mở rộng cho màn Admin "Nhóm cộng đồng" (D-23 → D-35):
 * chủ nhóm, điều phối viên, phòng mặc định, nội quy, ảnh bìa; xuất thành viên; từ khóa kiểm duyệt.
 * Endpoint chưa có trong §13 ghi ở questions.md (Q-G4c-1).
 */

/** Phòng chat mặc định có thể bật khi tạo nhóm; `general` luôn bật */
export const DEFAULT_ROOM_KEYS = ['general', 'qa', 'docs', 'events', 'board'] as const;
export type DefaultRoomKey = (typeof DEFAULT_ROOM_KEYS)[number];

export const extraRoomSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(120),
});
export type ExtraRoom = z.infer<typeof extraRoomSchema>;

/** Ảnh bìa: URL công khai storage (presign, NA-26) — server kiểm `head()` */
const coverUrlSchema = z.string().max(2000).nullable();

/** Trường mở rộng có mặc định để client cũ (chỉ gửi trường cơ bản) vẫn hợp lệ */
export const groupAdminUpsertSchema = groupUpsertSchema.extend({
  /** Bỏ trống = giữ chủ nhóm hiện tại / mặc định */
  ownerId: z.string().min(1).optional(),
  /** GR-R02: Giảng viên của nhóm (thay "điều phối viên" — D-56) */
  lecturerIds: z.array(z.string().min(1)).max(20).default([]),
  roomKeys: z.array(z.enum(DEFAULT_ROOM_KEYS)).default(['general', 'qa', 'docs']),
  extraRooms: z.array(extraRoomSchema).max(20).default([]),
  rules: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  coverUrl: coverUrlSchema.default(null),
});
export type GroupAdminUpsert = z.infer<typeof groupAdminUpsertSchema>;
export type GroupAdminUpsertInput = z.input<typeof groupAdminUpsertSchema>;

export const groupDetailSchema = groupItemSchema.extend({
  ownerId: z.string(),
  lecturerIds: z.array(z.string()),
  roomKeys: z.array(z.enum(DEFAULT_ROOM_KEYS)),
  extraRooms: z.array(extraRoomSchema),
  rules: z.array(z.string()),
});
export type GroupDetail = z.infer<typeof groupDetailSchema>;

/** Xuất danh sách thành viên nhóm */
export const GROUP_EXPORT_STATUS = ['all', ...USER_STATUS] as const;
export const GROUP_EXPORT_FORMATS = ['csv', 'xls'] as const;
/** Vai trò trong nhóm: Chủ nhóm / Giảng viên / Thành viên (GR-R02) */
export const GROUP_ROLES = ['owner', 'lecturer', 'member'] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

export const groupMembersQuerySchema = z.object({
  groupIds: z
    .string()
    .trim()
    .transform((s) => s.split(',').filter(Boolean)),
  status: z.enum(GROUP_EXPORT_STATUS).catch('all'),
});

export const groupMemberRowSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  userId: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  accountType: z.enum(['personal', 'business']),
  company: z.string(),
  taxCode: z.string(),
  groupRole: z.enum(GROUP_ROLES),
  country: z.string(),
  joinedAt: z.string(),
  status: z.enum(USER_STATUS),
});
export type GroupMemberRow = z.infer<typeof groupMemberRowSchema>;

export const groupMemberListSchema = z.object({ items: z.array(groupMemberRowSchema) });

export const groupMembersExportSchema = z.object({
  groupIds: z.array(z.string().min(1)).min(1),
  fields: z.array(z.string().min(1)).min(1),
  status: z.enum(GROUP_EXPORT_STATUS),
  format: z.enum(GROUP_EXPORT_FORMATS),
});
export type GroupMembersExport = z.infer<typeof groupMembersExportSchema>;

/** Bộ lọc từ khóa nhạy cảm của kiểm duyệt chat */
export const keywordSchema = z.object({ word: z.string().trim().min(1).max(60) });
export const keywordListSchema = z.object({ items: z.array(z.string()) });
