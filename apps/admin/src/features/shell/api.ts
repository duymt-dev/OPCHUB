import { pageSchema } from '@opchub/shared/api';
import {
  notificationListSchema,
  notificationReadResultSchema,
  projectCountsSchema,
  reportSchema,
  serviceRequestSummarySchema,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** SRS §13 `GET /notifications` + `POST /notifications/read` (như Portal) */

export const shellKeys = {
  notifications: ['notifications'] as const,
  badges: ['admin-nav-badges'] as const,
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

/** Số việc chờ trên sidebar (prototype BADGE): báo cáo mở, dự án chờ duyệt, yêu cầu mới */
export async function fetchNavBadges() {
  const [reports, projects, requests] = await Promise.all([
    api('/admin/reports?status=open&page=1&size=1', { schema: pageSchema(reportSchema) }),
    api('/admin/projects/counts', { schema: projectCountsSchema }),
    api('/admin/service-requests/summary', { schema: serviceRequestSummarySchema }),
  ]);
  return {
    groups: reports.total,
    projects: projects.pending_review,
    requests: requests.byStatus.new,
  };
}
