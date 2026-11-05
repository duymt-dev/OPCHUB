import {
  globalSearchResultSchema,
  notificationListSchema,
  notificationReadResultSchema,
  welcomeMailPreviewSchema,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** SRS §13 `GET /notifications` + bổ sung `POST /notifications/read`, `GET /me/welcome-mail` */

export const shellKeys = {
  notifications: ['notifications'] as const,
  /** FX-03: theo tài khoản — đổi tài khoản không hiện lại popup của phiên trước */
  welcome: (userId: string) => ['me', 'welcome-mail', userId] as const,
};

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

export const fetchGlobalSearch = (q: string) =>
  api(`/search?q=${encodeURIComponent(q)}`, { schema: globalSearchResultSchema });
