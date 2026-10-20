import { pageSchema } from '@opchub/shared/api';
import {
  eventItemSchema,
  notificationListSchema,
  notificationReadResultSchema,
  welcomeMailPreviewSchema,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** SRS §13 `GET /notifications` + bổ sung `POST /notifications/read`, `GET /me/welcome-mail` */

export const shellKeys = {
  notifications: ['notifications'] as const,
  welcome: ['me', 'welcome-mail'] as const,
  events: ['shell', 'events'] as const,
};

/** Chân sidebar ver2: sự kiện sắp tới (server sắp theo giờ bắt đầu) */
export const fetchUpcomingEvents = () =>
  api('/events?page=1&size=3', { schema: pageSchema(eventItemSchema) });

export const fetchNotifications = () =>
  api('/notifications?size=50', { schema: notificationListSchema });

/** Bỏ `ids` = đánh dấu tất cả */
export const markRead = (ids?: string[]) =>
  api('/notifications/read', {
    method: 'POST',
    body: ids ? { ids } : {},
    schema: notificationReadResultSchema,
  });

/** 204 (null) khi không có mail chào mừng chưa xem */
export const fetchWelcomeMail = () =>
  api('/me/welcome-mail', { schema: welcomeMailPreviewSchema.nullable() });
