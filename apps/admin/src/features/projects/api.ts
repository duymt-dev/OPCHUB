import { pageSchema } from '@opchub/shared/api';
import {
  adminProjectSchema,
  projectBulkResultSchema,
  type AdminProjectReview,
  type ProjectBulkAction,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';

/** SRS §13 Projects (admin) + bulk / xoá / nổi bật (Q-G5b-1) */

/** Tải trọn để đếm số trên tab và lọc tại chỗ như prototype (số dự án admin nhỏ) */
const ALL = 100;
const enc = encodeURIComponent;

export const projectKeys = {
  all: ['admin-projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
};

export const fetchProjects = () =>
  api(`/admin/projects?page=1&size=${ALL}`, { schema: pageSchema(adminProjectSchema) });

export const reviewProject = (id: string, body: AdminProjectReview) =>
  api(`/admin/projects/${enc(id)}/review`, { method: 'POST', body, schema: adminProjectSchema });

/** V4-610 (AD-06): thẩm định Gói Gọi vốn — 204 */
export const reviewFundraising = (id: string, fid: string, decision: 'approve' | 'reject') =>
  api(`/admin/projects/${enc(id)}/fundraising/${enc(fid)}/review`, {
    method: 'POST',
    body: { decision },
    schema: z.null(),
  });

export const bulkProjects = (ids: string[], action: ProjectBulkAction) =>
  api('/admin/projects/bulk', {
    method: 'POST',
    body: { ids, action },
    schema: projectBulkResultSchema,
  });

export const deleteProject = (id: string) =>
  api(`/admin/projects/${enc(id)}`, { method: 'DELETE', schema: z.object({ id: z.string() }) });

export const setFeatured = (projectId: string | null) =>
  api('/admin/projects/featured', {
    method: 'PUT',
    body: { projectId },
    schema: z.object({ projectId: z.string().nullable() }),
  });
