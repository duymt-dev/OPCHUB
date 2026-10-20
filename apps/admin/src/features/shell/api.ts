import {
  adminBadgesSchema,
  adminUpcomingSchema,
  notificationListSchema,
  notificationReadResultSchema,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** SRS §13 `GET /notifications` + `POST /notifications/read` (như Portal) */

export const shellKeys = {
  notifications: ['notifications'] as const,
  badges: ['admin-nav-badges'] as const,
  upcoming: ['shell', 'upcoming-events'] as const,
};

/** Chân sidebar ver2 — dùng chung khối "Sắp diễn ra" của màn Sự kiện (EV-R02) */
export const fetchUpcoming = () => api('/admin/events/upcoming', { schema: adminUpcomingSchema });

export const fetchNotifications = () =>
  api('/notifications?size=50', { schema: notificationListSchema });

/** Bỏ `ids` = đánh dấu tất cả */
export const markRead = (ids?: string[]) =>
  api('/notifications/read', {
    method: 'POST',
    body: ids ? { ids } : {},
    schema: notificationReadResultSchema,
  });

/** Số việc chờ trên sidebar (prototype BADGE) — một lần gọi; server đếm theo quyền người gọi */
export async function fetchNavBadges() {
  const b = await api('/admin/badges', { schema: adminBadgesSchema });
  return { groups: b.reports, projects: b.projects, requests: b.requests };
}
