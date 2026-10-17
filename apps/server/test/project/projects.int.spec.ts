import { pageSchema } from '@opchub/shared/api';
import {
  projectCardSchema,
  projectDetailSchema,
  projectStatsSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createProject, projectBody, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const errorOf = async (r: Response) =>
  ((await r.json()) as { error: { message: string; fields?: { path: string }[] } }).error;

describe('Dự án Portal (B32)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  // Giới hạn đăng nhập theo IP: mỗi test dùng nhiều tài khoản
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await removeTestProjects(t);
    await removeTestGroups(t);
    await t.close();
  });

  const member = async () => {
    const u = await createUser(t, { fee: 'active' });
    return { u, tk: await tokenOf(t, u) };
  };

  it('lưu: submit → Chờ duyệt, nháp → Bản nháp; HTML sanitize; đội mặc định là chủ dự án', async () => {
    const { tk } = await member();
    const r = await t.call('/projects', { method: 'POST', token: tk, json: projectBody() });
    expect(r.status).toBe(201);
    const card = projectCardSchema.parse(await r.json());
    expect(card.status).toBe('pending_review');
    expect(card.team).toHaveLength(1);
    expect(card.team[0]).toMatchObject({ role: 'Founder · CEO', isOwner: true });
    const own = projectDetailSchema.parse(
      await (await t.call(`/me/projects/${card.id}`, { token: tk })).json(),
    );
    expect(own.description).toBe('<p>Mô tả <b>đầy đủ</b></p>');

    const draft = projectCardSchema.parse(
      await (
        await t.call(`/projects/${card.id}`, {
          method: 'PATCH',
          token: tk,
          json: projectBody({ submit: false, name: '' }),
        })
      ).json(),
    );
    expect(draft).toMatchObject({ status: 'draft', name: 'Dự án chưa đặt tên' });
    const mine = (await (await t.call('/me/projects', { token: tk })).json()) as {
      items: { id: string }[];
    };
    expect(mine.items.map((i) => i.id)).toContain(card.id);
  });

  it('gửi đăng thiếu link test → 400 đúng trường; người khác sửa → 404; Đã ẩn → 409', async () => {
    const { tk } = await member();
    const bad = await t.call('/projects', {
      method: 'POST',
      token: tk,
      json: projectBody({ testUrl: '' }),
    });
    expect(bad.status).toBe(400);
    expect((await errorOf(bad)).fields?.[0]?.path).toBe('testUrl');

    const card = await createProject(t, tk);
    const other = await member();
    expect(
      (
        await t.call(`/projects/${card.id}`, {
          method: 'PATCH',
          token: other.tk,
          json: projectBody(),
        })
      ).status,
    ).toBe(404);
    await t.prisma.db.project.update({ where: { id: card.id }, data: { status: 'hidden' } });
    const hidden = await t.call(`/projects/${card.id}`, {
      method: 'PATCH',
      token: tk,
      json: projectBody(),
    });
    expect(hidden.status).toBe(409);
  });

  it('BR-08: riêng tư chỉ hiện cho nhóm được chia sẻ; chưa duyệt → 404', async () => {
    const g = await createGroup(t);
    const owner = await member();
    const insider = await member();
    const outsider = await member();
    await addMember(t, g.id, owner.u.id);
    await addMember(t, g.id, insider.u.id);
    const priv = await createProject(t, owner.tk, { visibility: 'private', groupIds: [g.id] });
    expect((await t.call(`/projects/${priv.id}`, { token: insider.tk })).status).toBe(200);
    expect((await t.call(`/projects/${priv.id}`, { token: outsider.tk })).status).toBe(404);
    const list = pageSchema(projectCardSchema).parse(
      await (
        await t.call(`/projects?size=100&q=${encodeURIComponent(priv.name)}`, {
          token: outsider.tk,
        })
      ).json(),
    );
    expect(list.total).toBe(0);

    const pending = await createProject(t, owner.tk, {}, false);
    expect((await t.call(`/projects/${pending.id}`, { token: insider.tk })).status).toBe(404);
  });

  it('khám phá: lọc giai đoạn / gọi vốn / q, sort follow; stats', async () => {
    const { tk } = await member();
    const fund = await createProject(t, tk, {
      stage: 'growth',
      funding: {
        amount: 2_000_000_000,
        currency: 'VND',
        equityPercent: 10,
        minTicket: 100_000_000,
      },
    });
    const viewer = await member();
    const byStage = pageSchema(projectCardSchema).parse(
      await (await t.call('/projects?size=100&stage=fund', { token: viewer.tk })).json(),
    );
    expect(byStage.items.some((p) => p.id === fund.id)).toBe(true);
    expect(byStage.items.every((p) => p.funding !== null)).toBe(true);
    const q = pageSchema(projectCardSchema).parse(
      await (
        await t.call(`/projects?q=${encodeURIComponent(fund.name)}`, { token: viewer.tk })
      ).json(),
    );
    expect(q.items[0]?.funding).toMatchObject({ amount: 2_000_000_000, minTicket: 100_000_000 });

    const stats = projectStatsSchema.parse(
      await (await t.call('/projects/stats', { token: viewer.tk })).json(),
    );
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.growing).toBeGreaterThan(0);
    expect(stats.featured).not.toBeNull();
    expect(stats.categories.find((c) => c.name === 'Fintech')?.count).toBeGreaterThan(0);
  });

  it('chi tiết: liên hệ từ hồ sơ chủ, updates, isOwner', async () => {
    const owner = await member();
    const p = await createProject(t, owner.tk);
    const viewer = await member();
    const d = projectDetailSchema.parse(
      await (await t.call(`/projects/${p.id}`, { token: viewer.tk })).json(),
    );
    expect(d.isOwner).toBe(false);
    expect(d.contact.email).toBe(owner.u.email);
    expect(d.updates.map((u) => u.title)).toContain('Ra mắt phiên bản 2.0');
    const mineD = projectDetailSchema.parse(
      await (await t.call(`/projects/${p.id}`, { token: owner.tk })).json(),
    );
    expect(mineD.isOwner).toBe(true);
  });

  it('Nhà đầu tư đọc được dự án nhưng không đăng được', async () => {
    const inv = await tokenOf(t, await createUser(t, { accountType: 'investor' }));
    expect((await t.call('/projects?size=5', { token: inv })).status).toBe(200);
    expect(
      (await t.call('/projects', { method: 'POST', token: inv, json: projectBody() })).status,
    ).toBe(403);
  });
});
