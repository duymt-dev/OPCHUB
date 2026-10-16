import { dashboardLiveSchema } from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** Bổ sung SRS §13: GET /dashboard/live — ảnh chụp số liệu LIVE của cộng đồng */

export const dashboardKeys = {
  all: ['dashboard'] as const,
  live: () => [...dashboardKeys.all, 'live'] as const,
};

export const fetchDashboardLive = () => api('/dashboard/live', { schema: dashboardLiveSchema });
