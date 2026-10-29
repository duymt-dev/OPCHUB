import { pageSchema } from '@opchub/shared/api';
import {
  adminProjectSchema,
  projectBulkResultSchema,
  projectCountsSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { z } from 'zod';
import { tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

/** Contract `project` — phần Admin (7), schema đúng như apps/admin/src/features/projects/api.ts */
describe('Contract: project (admin)', () => {
  let t: TestApp;
  let admin: string;
  let owner: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    owner = await tokenOf(t, await createUser(t, { fee: 'active' }));
  });
  afterAll(async () => {
    await t.call('/admin/projects/featured', {
      method: 'PUT',
      token: admin,
      json: { projectId: null },
    });
    await removeTestProjects(t);
    await t.close();
  });

  it('list → chi tiết → duyệt → nổi bật → bulk → đếm → xoá', async () => {
    // D-108 (TIP-V42-711): API không còn tạo `pending_review` — dựng dữ liệu cũ bằng ghi DB trực tiếp
    const p = await createProject(t, owner, { submit: false }, false);
    await t.prisma.db.project.update({ where: { id: p.id }, data: { status: 'pending_review' } });
    const other = await createProject(t, owner, { submit: false }, false);
    await t.prisma.db.project.update({
      where: { id: other.id },
      data: { status: 'pending_review' },
    });
    await ep(
      t,
      'GET',
      '/admin/projects',
      '/admin/projects?page=1&size=100',
      pageSchema(adminProjectSchema),
      { token: admin },
    );
    await ep(t, 'GET', '/admin/projects/:id', `/admin/projects/${p.id}`, adminProjectSchema, {
      token: admin,
    });
    await ep(
      t,
      'POST',
      '/admin/projects/:id/review',
      `/admin/projects/${p.id}/review`,
      adminProjectSchema,
      { token: admin, json: { decision: 'approve' } },
    );
    await ep(
      t,
      'PUT',
      '/admin/projects/featured',
      '/admin/projects/featured',
      z.object({ projectId: z.string().nullable() }),
      { token: admin, json: { projectId: p.id } },
    );
    await ep(t, 'POST', '/admin/projects/bulk', '/admin/projects/bulk', projectBulkResultSchema, {
      token: admin,
      json: { ids: [other.id], action: 'publish' },
    });
    await ep(t, 'GET', '/admin/projects/counts', '/admin/projects/counts', projectCountsSchema, {
      token: admin,
    });
    await ep(
      t,
      'DELETE',
      '/admin/projects/:id',
      `/admin/projects/${other.id}`,
      z.object({ id: z.string() }),
      { token: admin },
    );
  });
});
