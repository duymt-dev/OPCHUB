import { z } from 'zod';
import { lockDaysSchema } from './users';

/** SRS §13 Chat — GET /rooms/:id/messages, POST /messages/:id/report, /admin/reports */

/**
 * Tệp/ảnh đính kèm tin. `name/size/ext` để hiển thị ("640 KB", "PDF"); TIP-V2-111 thêm `url`
 * (object storage do chính người gửi tải lên), `bytes`, `contentType` — optional cho tin cũ.
 */
export const attachmentSchema = z.object({
  name: z.string().max(200),
  size: z.string().max(40),
  ext: z.string().max(10),
  url: z.string().max(2000).optional(),
  bytes: z.number().int().min(0).optional(),
  contentType: z.string().max(200).optional(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const reactionSchema = z.object({
  emoji: z.string(),
  count: z.number().int(),
  names: z.array(z.string()),
});

export const messageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  sender: z.object({ name: z.string(), avatarUrl: z.string().nullable() }),
  body: z.string(),
  attachment: attachmentSchema.nullable(),
  reactions: z.array(reactionSchema),
  pinned: z.boolean(),
  isSimulated: z.boolean(),
  /** Generic visibility marker; does not disclose persona identity. Optional for old payloads. */
  hiddenAt: z.string().datetime().nullable().optional(),
  createdAt: z.string(),
});
export type Message = z.infer<typeof messageSchema>;

export const messageQuerySchema = z.object({
  q: z.string().trim().optional(),
  before: z.string().optional(),
  /** S-06: bắt kịp sau reconnect — tin MỚI hơn id này, cũ → mới, tối đa 100 */
  after: z.string().optional(),
  size: z.coerce.number().int().min(1).max(100).catch(30),
});

export const REPORT_REASONS = ['spam', 'scam', 'abuse', 'personal_info', 'other'] as const;
export const REPORT_STATUS = ['open', 'resolved'] as const;
/**
 * V4-612 (D-77): `restore` = Khôi phục tin (hiện lại, không tính vi phạm); `lock` nhận `days`.
 * `dismiss | hide | warn` giữ cho client cũ (`dismiss` xử lý như `restore`).
 */
export const REPORT_ACTIONS = ['dismiss', 'hide', 'warn', 'lock', 'restore'] as const;
export const REPORT_SOURCES = ['auto', 'report'] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

export const reportMessageSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500).optional(),
});
export type ReportMessageRequest = z.infer<typeof reportMessageSchema>;

export const reportSchema = z.object({
  id: z.string(),
  senderName: z.string(),
  groupName: z.string(),
  body: z.string(),
  /** Đoạn khớp từ khóa / lý do để tô đậm */
  hit: z.string(),
  reason: z.enum(REPORT_REASONS),
  source: z.enum(REPORT_SOURCES),
  reporterCount: z.number().int(),
  status: z.enum(REPORT_STATUS),
  createdAt: z.string(),
  /** V4-612 (D-83): số vi phạm còn tính (90 ngày) của người gửi; 0 khi không có người gửi */
  violations: z.number().int().min(0).default(0),
  senderLocked: z.boolean().default(false),
  /** Hạn khoá (ISO) — null khi chưa khoá hoặc khoá không thời hạn */
  lockedUntil: z.string().nullable().default(null),
  /** Có người gửi và chưa bị khoá → hiện nút "Khóa N ngày" */
  canLock: z.boolean().default(false),
});
export type Report = z.infer<typeof reportSchema>;

export const reportQuerySchema = z.object({
  source: z.enum(REPORT_SOURCES).optional(),
  status: z.enum(REPORT_STATUS).optional(),
});

export const reportActionSchema = z.object({
  action: z.enum(REPORT_ACTIONS),
  note: z.string().trim().max(500).optional(),
  /** `lock`: số ngày (1/3/7/14/30); không gửi → theo cài đặt "Thời gian khóa" */
  days: lockDaysSchema.optional(),
});

/** V4-612: "Thời gian khóa" khi vi phạm lần 2+ — `app_settings.moderation` */
export const moderationSettingsSchema = z.object({ autoLockDays: lockDaysSchema });
export type ModerationSettings = z.infer<typeof moderationSettingsSchema>;
export const MODERATION_DEFAULTS: ModerationSettings = { autoLockDays: 7 };
/** Cửa sổ đếm vi phạm (D-83) */
export const VIOLATION_WINDOW_DAYS = 90;
/** Từ lần này trở đi tự khoá (§26.6) */
export const AUTO_LOCK_FROM = 2;
export const HIDDEN_MESSAGE_TEXT = 'Tin nhắn đã bị ẩn do vi phạm nội quy cộng đồng.';
export const VIOLATION_LOCK_REASON = 'Vi phạm nội quy cộng đồng';
