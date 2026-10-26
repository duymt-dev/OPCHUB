import {
  type ReportParams,
  reportExportResponseSchema,
  reportPreviewSchema,
  reportScopesSchema,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** V4-614: `GET /admin/reports/scopes|preview`, `POST /admin/reports/export` (job `report`) */

export const reportKeys = {
  scopes: ['admin-reports', 'scopes'] as const,
  preview: (p: ReportParams | null) => ['admin-reports', 'preview', p] as const,
};

export const fetchReportScopes = () => api('/admin/reports/scopes', { schema: reportScopesSchema });

export function fetchReportPreview(p: ReportParams) {
  const qs = new URLSearchParams(Object.entries(p));
  return api(`/admin/reports/preview?${qs.toString()}`, { schema: reportPreviewSchema });
}

export const exportReport = (p: ReportParams) =>
  api('/admin/reports/export', { method: 'POST', body: p, schema: reportExportResponseSchema });
