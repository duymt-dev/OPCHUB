import type { Notification, WelcomeMailPreview } from '../../api-domains';
import { mockDb } from './store';
import { mockWelcomeSeen } from './welcome-state';
import { iso, MOCK_NOW } from './util';
import { drainMockModerationWarnings } from './moderation-warning-jobs';
import { isLiveMockNotification } from './notification-runtime';

/**
 * Thông báo theo từng người (D-29) và mail chào mừng xem trước (P-05, D-30).
 * TK chưa có hộp thư (VD vừa đăng ký) → hộp thư rỗng, không dùng chung seed của TK demo.
 */

function inboxOf(userId: string): Notification[] {
  const db = mockDb();
  return db.notifications.get(userId) ?? [];
}

/**
 * Seed lưu `createdAt` theo MOCK_NOW; dời theo `now` của request để "x phút trước"
 * giống prototype (thông báo tạo lúc nạp trang).
 */
export const inboxNotifications = (userId: string, now: number = MOCK_NOW): Notification[] => {
  drainMockModerationWarnings(now);
  return inboxOf(userId).map((n) => ({
    ...n,
    createdAt: isLiveMockNotification(mockDb(), n.id)
      ? n.createdAt
      : iso(now - (MOCK_NOW - Date.parse(n.createdAt))),
  }));
};

/** Đánh dấu đã đọc; bỏ `ids` = tất cả. Trả số chưa đọc còn lại */
export function markNotificationsRead(userId: string, ids?: string[]): { unread: number } {
  const want = ids ? new Set(ids) : null;
  const next = inboxOf(userId).map((n) => (!want || want.has(n.id) ? { ...n, read: true } : n));
  mockDb().notifications.set(userId, next);
  return { unread: next.filter((n) => !n.read).length };
}

/** TK đã xem modal mail chào mừng (modal chỉ hiện một lần sau kích hoạt) */

/**
 * Mail chào mừng vừa gửi cho TK mới kích hoạt (id `n-<email>` — OTP hoặc SSO lần đầu).
 * Gọi lần đầu trả nội dung rồi đánh dấu đã xem; TK cũ / đã xem → null.
 * D-30: không gửi mật khẩu tạm — người dùng đã tự đặt mật khẩu.
 */
export function takeWelcomeMail(userId: string): WelcomeMailPreview | null {
  const welcomeSeen = mockWelcomeSeen();
  if (!userId.startsWith('n-') || welcomeSeen.has(userId)) return null;
  welcomeSeen.add(userId);
  const w = mockDb().welcomeMail;
  return {
    to: userId.slice(2),
    subject: w.subject,
    intro: w.intro,
    loginUrl: w.loginUrl,
    rules: w.rules,
    attachments: w.attachments.filter((a) => a.title.trim() || a.url.trim()),
    showRules: w.showRules,
    showGuide: w.showGuide,
  };
}
