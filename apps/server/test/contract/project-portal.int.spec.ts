import { pageSchema } from '@opchub/shared/api';
import {
  followResultSchema,
  likeResultSchema,
  projectCardSchema,
  projectCommentViewSchema,
  projectDetailSchema,
  projectReplyViewSchema,
  projectStatsSchema,
  repoAccessResultSchema,
  resolvedResultSchema,
  shareResultSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { z } from 'zod';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { projectBody, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

const items = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });

/** Contract `project` — phần Portal (15), schema đúng như apps/portal/src/features/projects/api.ts */
describe('Contract: project (portal)', () => {
  let t: TestApp;
  let owner: string;
  let viewer: string;
  let groupId: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    const o = await createUser(t, { fee: 'active' });
    owner = await tokenOf(t, o);
    viewer = await tokenOf(t, await createUser(t, { fee: 'active' }));
    groupId = (await createGroup(t)).id;
    await addMember(t, groupId, o.id);
  });
  afterAll(async () => {
    await removeTestProjects(t);
    await removeTestGroups(t);
    await t.close();
  });

  it('chủ dự án: tạo → sửa → của tôi → chia sẻ', async () => {
    const created = await ep(t, 'POST', '/projects', '/projects', projectCardSchema, {
      token: owner,
      json: projectBody({
        repo: { provider: 'github', url: 'https://github.com/opc/contract', visibility: 'private' },
      }),
    });
    const id = created.data.id;
    await ep(t, 'PATCH', '/projects/:id', `/projects/${id}`, projectCardSchema, {
      token: owner,
      json: projectBody({
        summary: 'Đã sửa',
        repo: { provider: 'github', url: 'https://github.com/opc/contract', visibility: 'private' },
      }),
    });
    await ep(t, 'GET', '/me/projects', '/me/projects', items(projectCardSchema), {
      token: owner,
    });
    await ep(t, 'GET', '/me/projects/:id', `/me/projects/${id}`, projectDetailSchema, {
      token: owner,
    });
    // Admin duyệt trực tiếp trên DB: phần Portal chỉ kiểm hợp đồng đọc/tương tác
    await t.prisma.db.project.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
    await ep(t, 'POST', '/projects/:id/share', `/projects/${id}/share`, shareResultSchema, {
      token: owner,
      json: { groupIds: [groupId], message: 'Mời góp ý' },
    });

    // Người xem: khám phá, chi tiết, theo dõi, xin quyền repo, góp ý
    await ep(t, 'GET', '/projects/stats', '/projects/stats', projectStatsSchema, {
      token: viewer,
    });
    await ep(
      t,
      'GET',
      '/projects',
      '/projects?page=1&size=100&sort=new',
      pageSchema(projectCardSchema),
      { token: viewer },
    );
    await ep(t, 'GET', '/projects/:id', `/projects/${id}`, projectDetailSchema, {
      token: viewer,
    });
    await ep(t, 'PUT', '/projects/:id/follow', `/projects/${id}/follow`, followResultSchema, {
      token: viewer,
      json: { following: true },
    });
    await ep(
      t,
      'POST',
      '/projects/:id/repo-access',
      `/projects/${id}/repo-access`,
      repoAccessResultSchema,
      { token: viewer },
    );
    const comment = await ep(
      t,
      'POST',
      '/projects/:id/comments',
      `/projects/${id}/comments`,
      projectCommentViewSchema,
      { token: viewer, json: { type: 'question', body: 'Có bản dùng thử không?' } },
    );
    const cid = comment.data.id;
    await ep(t, 'PUT', '/comments/:id/like', `/comments/${cid}/like`, likeResultSchema, {
      token: owner,
      json: { liked: true },
    });
    await ep(
      t,
      'POST',
      '/comments/:id/replies',
      `/comments/${cid}/replies`,
      projectReplyViewSchema,
      { token: owner, json: { body: 'Cảm ơn bạn!' } },
    );
    await ep(
      t,
      'PUT',
      '/comments/:id/resolved',
      `/comments/${cid}/resolved`,
      resolvedResultSchema,
      { token: owner, json: { resolved: true } },
    );
    await ep(
      t,
      'GET',
      '/projects/:id/comments',
      `/projects/${id}/comments`,
      items(projectCommentViewSchema),
      { token: viewer },
    );
  });
});
