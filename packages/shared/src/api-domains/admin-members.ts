import { z } from 'zod';
import { pageSchema } from '../api';
import { USER_STATUS } from '../enums';
import { idListSchema, pageQuerySchema } from './common';

/**
 * SRS §13 Users (admin) — màn Thành viên (D-07 → D-17).
 * `GET /admin/users?type&q&page&size` trả thêm hồ sơ đăng ký + số đếm theo loại.
 * Bổ sung ngoài SRS (Q-G4a-1): `PATCH /admin/users/:id/role`, `POST /admin/users/status`,
 * `POST /admin/users/:id/verification`.
 */

export const ADMIN_MEMBER_TYPES = ['business', 'personal'] as const;
export type AdminMemberType = (typeof ADMIN_MEMBER_TYPES)[number];

/** Quyền hệ thống đổi được từ màn Thành viên (Super Admin không gán ở đây) */
export const MANAGED_ROLES = ['member', 'moderator', 'admin'] as const;
export type ManagedRole = (typeof MANAGED_ROLES)[number];

/** D-40: tự gắn "verified" theo MST; không khớp → "pending" chờ admin duyệt tay */
export const BIZ_VERIFICATION = ['verified', 'pending', 'rejected'] as const;
export type BizVerification = (typeof BIZ_VERIFICATION)[number];

export const adminMemberBusinessSchema = z.object({
  taxCode: z.string(),
  companyName: z.string(),
  field: z.string(),
  size: z.string(),
  country: z.string(),
  position: z.string(),
  verification: z.enum(BIZ_VERIFICATION),
});

export const adminMemberSchema = z.object({
  id: z.string(),
  accountType: z.enum(ADMIN_MEMBER_TYPES),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  /** Mã quốc gia ISO-2 của số điện thoại (cờ) */
  country: z.string(),
  organization: z.string(),
  /** "Bạn là" khi đăng ký cá nhân (Chuyên gia, Freelancer…) */
  persona: z.string(),
  systemRole: z.enum(MANAGED_ROLES),
  status: z.enum(USER_STATUS),
  createdAt: z.string(),
  groupIds: z.array(z.string()),
  business: adminMemberBusinessSchema.nullable(),
});
export type AdminMember = z.infer<typeof adminMemberSchema>;

export const adminMemberQuerySchema = pageQuerySchema(10).extend({
  type: z.enum(ADMIN_MEMBER_TYPES).optional().catch(undefined),
});

export const adminMemberCountsSchema = z.object({
  all: z.number().int(),
  business: z.number().int(),
  personal: z.number().int(),
});

export const adminMemberPageSchema = pageSchema(adminMemberSchema).extend({
  /** Đếm theo loại trên toàn bộ thành viên (chip lọc), không phụ thuộc `q` */
  counts: adminMemberCountsSchema,
});
export type AdminMemberPage = z.infer<typeof adminMemberPageSchema>;

/** D-42: cần `s.role`, xác nhận + audit */
export const memberRoleUpdateSchema = z.object({ role: z.enum(MANAGED_ROLES) });
export type MemberRoleUpdate = z.infer<typeof memberRoleUpdateSchema>;

export const bulkStatusSchema = z.object({
  userIds: idListSchema,
  status: z.enum(USER_STATUS),
  reason: z.string().trim().max(500).optional(),
});
export type BulkStatusRequest = z.infer<typeof bulkStatusSchema>;
export const bulkStatusResultSchema = z.object({ updated: z.number().int() });

export const BIZ_DECISIONS = ['approve', 'reject'] as const;
export const bizVerificationDecisionSchema = z.object({
  decision: z.enum(BIZ_DECISIONS),
  reason: z.string().trim().max(500).optional(),
});
export type BizVerificationDecision = z.infer<typeof bizVerificationDecisionSchema>;
