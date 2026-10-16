import { notificationListSchema, notificationReadResultSchema } from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** SRS §13 `GET /notifications` + `POST /notifications/read` (như Portal) */

export const shellKeys = {
  notifications: ['notifications'] as const,
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
