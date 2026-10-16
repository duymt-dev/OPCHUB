import { z } from 'zod';
import { cursorPageSchema } from './common';
import { notificationSchema } from './settings';

/** Thông báo theo từng người (D-29) + mail chào mừng xem trước (P-05, D-30) */

export const notificationListSchema = cursorPageSchema(notificationSchema).extend({
  unread: z.number().int().min(0),
});
export type NotificationList = z.infer<typeof notificationListSchema>;

/** Bổ sung SRS §13: `POST /notifications/read` — bỏ `ids` = đánh dấu tất cả */
export const notificationReadSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).optional(),
});
export type NotificationReadRequest = z.infer<typeof notificationReadSchema>;
export const notificationReadResultSchema = z.object({ unread: z.number().int().min(0) });

/**
 * Bổ sung SRS §13: `GET /me/welcome-mail` — mail chào mừng vừa gửi.
 * D-30: không có mật khẩu tạm (người dùng đã tự đặt mật khẩu khi đăng ký).
 */
export const welcomeMailPreviewSchema = z.object({
  /** Lời chào dùng họ tên trong phiên (`Me.fullName`) */
  to: z.string(),
  subject: z.string(),
  intro: z.string(),
  loginUrl: z.string(),
  rules: z.array(z.string()),
  attachments: z.array(z.object({ title: z.string(), url: z.string() })),
  showRules: z.boolean(),
  showGuide: z.boolean(),
});
export type WelcomeMailPreview = z.infer<typeof welcomeMailPreviewSchema>;
