import { afterAll, beforeAll, expect, it } from 'vitest';
import { pageSchema } from '@opchub/shared/api';
import { projectCardSchema } from '@opchub/shared/api-domains';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

let t: TestApp;
const viewers: string[] = [];
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.prisma.db.groupMember.deleteMany({ where: { userId: { in: viewers } } });
  await removeTestProjects(t);
  await t.close();
});

it.each(['team', 'group'] as const)(
  'D-109 %s access cannot bypass owner expiry',
  async (access) => {
    const owner = await createUser(t, { fee: 'trial' });
    const viewer = await createUser(t, { fee: 'trial' });
    viewers.push(viewer.id);
    const ownerToken = await tokenOf(t, owner);
    const viewerToken = await tokenOf(t, viewer);
    const project = await createProject(t, ownerToken, { visibility: 'private' }, false);
    if (access === 'team') {
      await t.prisma.db.projectMember.create({
        data: { projectId: project.id, userId: viewer.id, name: 'Test collaborator' },
      });
    } else {
      await t.prisma.db.groupMember.create({ data: { groupId: 'c1', userId: viewer.id } });
      await t.prisma.db.projectShare.create({ data: { projectId: project.id, groupId: 'c1' } });
    }
    const list = async () => {
      const res = await t.call(`/projects?q=${encodeURIComponent(project.name)}`, {
        token: viewerToken,
      });
      expect(res.status).toBe(200);
      return pageSchema(projectCardSchema)
        .parse(await res.json())
        .items.map((p) => p.id);
    };
    expect(await list()).toContain(project.id);
    expect((await t.call(`/projects/${project.id}`, { token: viewerToken })).status).toBe(200);
    await t.prisma.db.membershipFee.update({
      where: { userId: owner.id },
      data: { validUntil: new Date(0) },
    });
    expect(await list()).not.toContain(project.id);
    expect((await t.call(`/projects/${project.id}`, { token: viewerToken })).status).toBe(404);
    expect((await t.call(`/me/projects/${project.id}`, { token: ownerToken })).status).toBe(200);
    await t.prisma.db.membershipFee.update({
      where: { userId: owner.id },
      data: { validUntil: new Date(Date.now() + 864e5) },
    });
    expect(await list()).toContain(project.id);
    expect((await t.call(`/projects/${project.id}`, { token: viewerToken })).status).toBe(200);
  },
);
