import { z } from 'zod';
import { eventItemSchema, eventRegistrationRowSchema, eventUpsertSchema } from './events';

/**
 * SRS §13 Events (admin) — phần mở rộng cho màn Admin "Nội dung & Sự kiện" (D-42 → D-50):
 * giờ kết thúc, link bản đồ, nhóm tổ chức, mở/đóng đăng ký, ảnh bìa; check-in, xuất danh sách.
 * Endpoint chưa có trong §13 ghi ở questions.md (Q-G5a-1).
 */

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
const httpUrl = z
  .string()
  .trim()
  .regex(/^https?:\/\/\S+$/);

export const adminEventSchema = eventItemSchema.extend({
  endTime: hhmm.nullable(),
  mapUrl: z.string().nullable(),
  groupId: z.string().nullable(),
  registrationOpen: z.boolean(),
  coverUrl: z.string().nullable(),
});
export type AdminEvent = z.infer<typeof adminEventSchema>;

/** Thân POST /admin/events, PATCH /admin/events/:id — trường mới có mặc định (client cũ hợp lệ) */
export const adminEventUpsertSchema = eventUpsertSchema.extend({
  endTime: hhmm.nullable().default(null),
  mapUrl: httpUrl.nullable().default(null),
  groupId: z.string().min(1).nullable().default(null),
  registrationOpen: z.boolean().default(true),
  coverUrl: z.string().max(2000).nullable().default(null),
});
export type AdminEventUpsert = z.output<typeof adminEventUpsertSchema>;
export type AdminEventUpsertInput = z.input<typeof adminEventUpsertSchema>;

/** Dòng danh sách đăng ký kèm tổ chức (drawer "Danh sách đăng ký") */
export const eventRegistrantSchema = eventRegistrationRowSchema.extend({ org: z.string() });
export type EventRegistrant = z.infer<typeof eventRegistrantSchema>;

/** POST /admin/events/:id/registrations/check-in — một người hoặc "Check-in tất cả" */
export const eventCheckInSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(1000),
  attended: z.boolean(),
});
export type EventCheckIn = z.infer<typeof eventCheckInSchema>;

/** POST /admin/events/:id/registrations/export → CSV (ghi audit: xuất dữ liệu cá nhân) */
export const eventRegistrantsExportSchema = z.object({ filename: z.string(), csv: z.string() });
export type EventRegistrantsExport = z.infer<typeof eventRegistrantsExportSchema>;
