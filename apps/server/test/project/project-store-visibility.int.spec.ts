import { pageSchema } from '@opchub/shared/api';
import { projectCardSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import { createProject, projectBody, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-612 QT-ST-PJ / BR-TRIAL-04', () => {
  let t: TestApp;
  const stores: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await removeTestProjects(t);
    await t.prisma.db.store.deleteMany({ where: { id: { in: stores } } });
    await t.close();
  });

  const member = async () => {
    const u = await createUser(t, { fee: 'trial' });
    return { u, token: await tokenOf(t, u) };
  };
  const list = async (token: string, query: string) => {
    const response = await t.call(`/projects?${query}`, { token });
    expect(response.status).toBe(200);
    return pageSchema(projectCardSchema).parse(await response.json());
  };

  it('QT-ST-PJ storeId lọc trước phân trang, tỉnh riêng thắng tỉnh nhóm, private/draft không rò', async () => {
    const owner = await member();
    const viewer = await member();
    const s = await t.prisma.db.store.create({
      data: { ownerId: owner.u.id, name: 'Gian hàng thử' },
      select: { id: true },
    });
    stores.push(s.id);
    const p = await createProject(t, owner.token, { storeId: s.id, province: 'Cà Mau' }, false);
    await createProject(t, owner.token, { storeId: s.id, visibility: 'private' }, false);
    await createProject(t, owner.token, { storeId: s.id, submit: false }, false);
    await createProject(t, owner.token, {}, false);
    expect((await list(viewer.token, `storeId=${s.id}&size=1`)).items.map((x) => x.id)).toEqual([
      p.id,
    ]);
    expect((await list(viewer.token, 'storeId=missing')).total).toBe(0);
    await t.prisma.db.project.update({ where: { id: p.id }, data: { groupId: 'c1' } });
    expect(
      (await list(viewer.token, `storeId=${s.id}&provinces=${encodeURIComponent('Cà Mau')}`)).total,
    ).toBe(1);
    expect(
      (await list(viewer.token, `storeId=${s.id}&provinces=${encodeURIComponent('Hà Nội')}`)).total,
    ).toBe(0);
    expect((await t.call('/projects?storeId=', { token: viewer.token })).status).toBe(400);
  });

  it('D-109 hết phí/đến hạn ẩn khỏi list/detail; active/trial/expiring còn hạn tự hiện lại', async () => {
    const owner = await member();
    const viewer = await member();
    const p = await createProject(t, owner.token, {}, false);
    const query = `q=${encodeURIComponent(p.name)}`;
    const fee = (status: 'expired' | 'trial' | 'active' | 'expiring', validUntil: Date) =>
      t.prisma.db.membershipFee.update({
        where: { userId: owner.u.id },
        data: { status, validUntil },
      });
    await fee('expired', new Date(0));
    expect((await list(viewer.token, query)).total).toBe(0);
    expect((await t.call(`/projects/${p.id}`, { token: viewer.token })).status).toBe(404);
    expect((await t.call(`/me/projects/${p.id}`, { token: owner.token })).status).toBe(200);
    await fee('trial', new Date(Date.now() + 864e5));
    expect((await list(viewer.token, query)).total).toBe(1);
    await fee('active', new Date(Date.now() + 864e5));
    expect((await list(viewer.token, query)).total).toBe(1);
    await fee('expiring', new Date(Date.now() + 864e5));
    expect((await t.call(`/projects/${p.id}`, { token: viewer.token })).status).toBe(200);
    await fee('active', new Date(0));
    expect((await list(viewer.token, query)).total).toBe(0);
    expect(
      await t.prisma.db.project.findUnique({ where: { id: p.id }, select: { status: true } }),
    ).toEqual({ status: 'published' });
  });

  it('D-108 hết phí không được đăng; trial đăng hiện ngay không cần Admin duyệt', async () => {
    const expired = await createUser(t, { fee: 'expired' });
    const token = await tokenOf(t, expired);
    expect((await t.call('/projects', { token, method: 'POST', json: projectBody() })).status).toBe(
      402,
    );
    const owner = await member();
    const p = await createProject(t, owner.token, {}, false);
    expect(p.status).toBe('published');
    const viewer = await member();
    expect((await t.call(`/projects/${p.id}`, { token: viewer.token })).status).toBe(200);
  });
});
