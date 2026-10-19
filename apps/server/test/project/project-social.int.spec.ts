import {
  followResultSchema,
  likeResultSchema,
  projectCommentViewSchema,
  projectDetailSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('Tương tác dự án (B32)', () => {
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

  it('theo dõi idempotent: bật 2 lần +1, tắt -1', async () => {
    const owner = await member();
    const p = await createProject(t, owner.tk);
    const v = await member();
    const put = async (following: boolean) =>
      followResultSchema.parse(
        await (
          await t.call(`/projects/${p.id}/follow`, {
            method: 'PUT',
            token: v.tk,
            json: { following },
          })
        ).json(),
      );
    expect((await put(true)).followers).toBe(1);
    expect((await put(true)).followers).toBe(1);
    expect(await put(false)).toEqual({ followers: 0, followedByMe: false });
  });

  it('góp ý → like → trả lời của chủ → chỉ chủ đánh dấu đã xử lý', async () => {
    const owner = await member();
    const p = await createProject(t, owner.tk);
    const v = await member();
    const c = projectCommentViewSchema.parse(
      await (
        await t.call(`/projects/${p.id}/comments`, {
          method: 'POST',
          token: v.tk,
          json: { type: 'question', body: 'Có bản dùng thử không?' },
        })
      ).json(),
    );
    expect(c.author.title).toBe('Thành viên OPC Hub');
    const like = likeResultSchema.parse(
      await (
        await t.call(`/comments/${c.id}/like`, {
          method: 'PUT',
          token: owner.tk,
          json: { liked: true },
        })
      ).json(),
    );
    expect(like.likes).toBe(1);
    const rep = await t.call(`/comments/${c.id}/replies`, {
      method: 'POST',
      token: owner.tk,
      json: { body: 'Cảm ơn bạn!' },
    });
    expect(rep.status).toBe(201);
    expect(
      (
        await t.call(`/comments/${c.id}/resolved`, {
          method: 'PUT',
          token: v.tk,
          json: { resolved: true },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await t.call(`/comments/${c.id}/resolved`, {
          method: 'PUT',
          token: owner.tk,
          json: { resolved: true },
        })
      ).status,
    ).toBe(200);
    const list = (await (await t.call(`/projects/${p.id}/comments`, { token: v.tk })).json()) as {
      items: unknown[];
    };
    const first = projectCommentViewSchema.parse(list.items[0]);
    expect(first).toMatchObject({ resolved: true, likes: 1, likedByMe: false });
    expect(first.replies[0]).toMatchObject({ body: 'Cảm ơn bạn!', isOwner: true });
    const detail = projectDetailSchema.parse(
      await (await t.call(`/projects/${p.id}`, { token: v.tk })).json(),
    );
    expect(detail.commentCount).toBe(1);
  });

  it('repo riêng tư: xin quyền 201, lặp 409; repo công khai → 404', async () => {
    const owner = await member();
    const priv = await createProject(t, owner.tk, {
      repo: { provider: 'github', url: 'https://github.com/opc/secret', visibility: 'private' },
    });
    const pub = await createProject(t, owner.tk, {
      repo: { provider: 'gitlab', url: 'https://gitlab.com/opc/open', visibility: 'public' },
    });
    const v = await member();
    const ask = (id: string) =>
      t.call(`/projects/${id}/repo-access`, { method: 'POST', token: v.tk });
    expect((await ask(priv.id)).status).toBe(201);
    expect((await ask(priv.id)).status).toBe(409);
    expect((await ask(pub.id)).status).toBe(404);
    const d = projectDetailSchema.parse(
      await (await t.call(`/projects/${priv.id}`, { token: v.tk })).json(),
    );
    expect(d.repoAccessRequested).toBe(true);
  });

  it('REQ-221 NA-21 repo private ẩn URL với người ngoài; chủ dự án và repo công khai vẫn thấy', async () => {
    const owner = await member();
    const priv = await createProject(t, owner.tk, {
      repo: { provider: 'github', url: 'https://github.com/opc/hidden', visibility: 'private' },
    });
    const pub = await createProject(t, owner.tk, {
      repo: { provider: 'gitlab', url: 'https://gitlab.com/opc/shown', visibility: 'public' },
    });
    const v = await member();
    const detail = async (id: string, tk: string) => {
      const r = await t.call(`/projects/${id}`, { token: tk });
      const raw = await r.text();
      return { raw, d: projectDetailSchema.parse(JSON.parse(raw)) };
    };
    const outsider = await detail(priv.id, v.tk);
    expect(outsider.d.repo).toMatchObject({ provider: 'github', visibility: 'private', url: null });
    // không lộ ở bất kỳ trường nào của response
    expect(outsider.raw).not.toContain('opc/hidden');
    expect((await detail(priv.id, owner.tk)).d.repo?.url).toBe('https://github.com/opc/hidden');
    expect((await detail(pub.id, v.tk)).d.repo?.url).toBe('https://gitlab.com/opc/shown');
  });

  it('chia sẻ: chỉ nhóm mình tham gia → tin vào phòng Chung; không nhóm nào → 409', async () => {
    const g = await createGroup(t);
    const other = await createGroup(t);
    const owner = await member();
    await addMember(t, g.id, owner.u.id);
    const p = await createProject(t, owner.tk);
    const none = await t.call(`/projects/${p.id}/share`, {
      method: 'POST',
      token: owner.tk,
      json: { groupIds: [other.id] },
    });
    expect(none.status).toBe(409);
    const ok = await t.call(`/projects/${p.id}/share`, {
      method: 'POST',
      token: owner.tk,
      json: { groupIds: [g.id, other.id], message: 'Mời góp ý' },
    });
    expect(await ok.json()).toEqual({ groupCount: 1 });
    const msg = await t.prisma.db.message.findFirst({
      where: { roomId: `${g.id}-general`, senderId: owner.u.id },
      select: { body: true },
    });
    expect(msg?.body).toBe(`Mời góp ý → ${p.name}`);
    const stranger = await member();
    expect(
      (
        await t.call(`/projects/${p.id}/share`, {
          method: 'POST',
          token: stranger.tk,
          json: { groupIds: [g.id] },
        })
      ).status,
    ).toBe(404);
  });
});
