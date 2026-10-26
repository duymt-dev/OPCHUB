import { z } from 'zod';
import { pageSchema } from '../api';
import { USER_STATUS } from '../enums';
import { idListSchema, pageQuerySchema } from './common';
import { ADMIN_ONBOARDING_FILTERS, adminOnboardingSchema } from './onboarding';

/**
 * SRS §13 Users (admin) — màn Thành viên (D-07 → D-17).
 * `GET /admin/users?type&q&page&size` trả thêm hồ sơ đăng ký + số đếm theo loại.
 * Bổ sung ngoài SRS (Q-G4a-1): `PATCH /admin/users/:id/role`, `POST /admin/users/status`,
 * `POST /admin/users/:id/verification`.
 */

export const ADMIN_MEMBER_TYPES = ['business', 'personal'] as const;
export type AdminMemberType = (typeof ADMIN_MEMBER_TYPES)[number];

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
  /** "Bạn là" khi đăng ký (cột "Vai trò khi đăng ký", RB-R01 — chỉ đọc; vai trò quản trị ở `admin_users`) */
  persona: z.string(),
  status: z.enum(USER_STATUS),
  createdAt: z.string(),
  groupIds: z.array(z.string()),
  business: adminMemberBusinessSchema.nullable(),
  /** V4-611 cột "Khởi đầu" x/8 (AD-02, D-85) */
  onboarding: adminOnboardingSchema,
});
export type AdminMember = z.infer<typeof adminMemberSchema>;

export const adminMemberQuerySchema = pageQuerySchema(10).extend({
  type: z.enum(ADMIN_MEMBER_TYPES).optional().catch(undefined),
  /** V4-611: Đã hoàn tất / Chưa hoàn tất */
  onboarding: z.enum(ADMIN_ONBOARDING_FILTERS).optional().catch(undefined),
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
