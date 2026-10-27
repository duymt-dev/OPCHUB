import { pageSchema } from '@opchub/shared/api';
import {
  projectCardSchema,
  projectDetailSchema,
  projectStatsSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import {
  activateFundraising,
  createProject,
  projectBody,
  removeTestProjects,
} from '../factories/project.factory';
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

    // Bản nháp mới: lưu nháp giữ Bản nháp (BUG-033: Chờ duyệt không lùi về Nháp — test riêng)
    const fresh = projectCardSchema.parse(
      await (
        await t.call('/projects', {
          method: 'POST',
          token: tk,
          json: projectBody({ submit: false }),
        })
      ).json(),
    );
    expect(fresh.status).toBe('draft');
    const draft = projectCardSchema.parse(
      await (
        await t.call(`/projects/${fresh.id}`, {
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
    // V4-610: khai báo chưa có Gói Gọi vốn → không vào "Đang gọi vốn", người khác không thấy số vốn
    const before = pageSchema(projectCardSchema).parse(
      await (await t.call('/projects?size=100&stage=fund', { token: viewer.tk })).json(),
    );
    expect(before.items.some((p) => p.id === fund.id)).toBe(false);
    await activateFundraising(t, fund.id);
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
    expect(stats.categories.find((c) => c.name === 'Chuyển đổi số & AI')?.count).toBeGreaterThan(0);
    // D-89 (v4) hero: đơn vị tham gia = số chủ dự án; kết nối = góp ý + 3 × dự án
    expect(stats.owners).toBeGreaterThan(0);
    expect(stats.connections).toBeGreaterThanOrEqual(3 * stats.total);
  });

  it('D-89 khám phá v4: lọc đối tượng / tỉnh / giai đoạn / nhu cầu, sắp lượt xem; mở chi tiết +1 lượt xem', async () => {
    const owner = await member();
    const p = await createProject(t, owner.tk, { audience: 'student', stage: 'developing' });
    // địa phương = tỉnh của nhóm dự án (seed bắt buộc có nhóm tỉnh c1 = Hà Nội)
    await t.prisma.db.project.update({
      where: { id: p.id },
      data: { needs: ['pilot', 'experts'], viewCount: 9_999_999, groupId: 'c1' },
    });
    const viewer = await member();
    const list = async (qs: string) =>
      pageSchema(projectCardSchema).parse(
        await (await t.call(`/projects?size=100&${qs}`, { token: viewer.tk })).json(),
      ).items;
    const hit = (items: { id: string }[]) => items.some((x) => x.id === p.id);
    expect(hit(await list('audience=student&stages=developing,idea&needs=pilot'))).toBe(true);
    expect(hit(await list('audience=business'))).toBe(false);
    expect(hit(await list('needs=customers,investors'))).toBe(false);
    const card = (await list('sort=view'))[0];
    expect(card).toMatchObject({
      id: p.id,
      audience: 'student',
      stage: 'developing',
      views: 9_999_999,
    });
    expect(card?.needs).toEqual(['pilot', 'experts']);
    expect(card?.province).toBe('Hà Nội');
    expect(hit(await list(`provinces=${encodeURIComponent('Hà Nội,Huế')}`))).toBe(true);
    expect(hit(await list(`provinces=${encodeURIComponent('Huế')}`))).toBe(false);
    expect((await t.call('/projects?stages=zzz', { token: viewer.tk })).status).toBe(400);
    // người khác mở chi tiết → +1; chủ dự án mở → không đổi
    await t.call(`/projects/${p.id}`, { token: viewer.tk });
    await t.call(`/projects/${p.id}`, { token: owner.tk });
    const row = await t.prisma.db.project.findUniqueOrThrow({
      where: { id: p.id },
      select: { viewCount: true },
    });
    expect(row.viewCount).toBe(10_000_000);
  });

  it('chi tiết: liên hệ công khai của dự án, updates, isOwner', async () => {
    const owner = await member();
    const p = await createProject(t, owner.tk, {
      contactEmail: 'lienhe@du-an.vn',
      contactPhone: '0912 345 678',
      contactAddress: '45 Bạch Đằng, Đà Nẵng',
    });
    const viewer = await member();
    const d = projectDetailSchema.parse(
      await (await t.call(`/projects/${p.id}`, { token: viewer.tk })).json(),
    );
    expect(d.isOwner).toBe(false);
    expect(d.contact).toEqual({
      email: 'lienhe@du-an.vn',
      phone: '0912 345 678',
      address: '45 Bạch Đằng, Đà Nẵng',
    });
    // D-89 (v4): mốc xuất bản đứng cuối, không còn "Tạo dự án" khi đã xuất bản
    expect(d.updates.map((u) => u.title)).toEqual(['Xuất bản trên OPC Hub']);
    const mineD = projectDetailSchema.parse(
      await (await t.call(`/projects/${p.id}`, { token: owner.tk })).json(),
    );
    expect(mineD.isOwner).toBe(true);
  });

  it('BUG-016 QT-09 chi tiết dự án không lộ email/SĐT/địa chỉ TK', async () => {
    const owner = await member();
    const address = `Số ${Date.now()} Láng Hạ, Hà Nội`;
    await t.prisma.db.businessProfile.upsert({
      where: { userId: owner.u.id },
      create: {
        userId: owner.u.id,
        taxCode: '0101234567',
        companyName: 'Công ty Thử',
        representative: 'Người thử',
        position: 'Giám đốc',
        mainField: 'Fintech',
        subFields: [],
        address,
      },
      update: { address },
    });
    const acc = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: owner.u.id },
      select: { email: true, phone: true },
    });
    const p = await createProject(t, owner.tk);
    const viewer = await member();
    const res = await t.call(`/projects/${p.id}`, { token: viewer.tk });
    const raw = await res.text();
    const d = projectDetailSchema.parse(JSON.parse(raw));
    expect(d.contact).toEqual({ email: null, phone: null, address: null });
    expect(raw).not.toContain(acc.email);
    expect(acc.phone).toBeTruthy();
    expect(raw).not.toContain(acc.phone ?? '');
    expect(raw).not.toContain(address);
  });

  it('BUG-016 contactPhone sai định dạng → 400; rỗng → null', async () => {
    const { tk } = await member();
    const bad = await t.call('/projects', {
      method: 'POST',
      token: tk,
      json: projectBody({ contactPhone: 'abc' }),
    });
    expect(bad.status).toBe(400);
    expect((await errorOf(bad)).fields?.[0]?.path).toBe('contactPhone');
    const badMail = await t.call('/projects', {
      method: 'POST',
      token: tk,
      json: projectBody({ contactEmail: 'khong-phai-email' }),
    });
    expect(badMail.status).toBe(400);
    expect((await errorOf(badMail)).fields?.[0]?.path).toBe('contactEmail');
    const card = await createProject(t, tk, { contactEmail: '', contactPhone: '  ' });
    const row = await t.prisma.db.project.findUniqueOrThrow({
      where: { id: card.id },
      select: { contactEmail: true, contactPhone: true },
    });
    expect(row).toEqual({ contactEmail: null, contactPhone: null });
  });

  const patch = (tk: string, id: string, over: Parameters<typeof projectBody>[0] = {}) =>
    t.call(`/projects/${id}`, { method: 'PATCH', token: tk, json: projectBody(over) });

  it('REQ-106 D-18 sửa dự án đang hiển thị tạo bản sửa, bản công khai giữ nguyên', async () => {
    const owner = await member();
    const p = await createProject(t, owner.tk);
    const newName = `${p.name} v2`;
    const r = await patch(owner.tk, p.id, { name: newName, summary: 'Tóm tắt mới' });
    expect(r.status).toBe(200);
    const card = projectCardSchema.parse(await r.json());
    expect(card).toMatchObject({
      status: 'published',
      name: p.name,
      revision: { status: 'pending_review', reviewNote: null },
    });
    const viewer = await member();
    const pub = projectDetailSchema.parse(
      await (await t.call(`/projects/${p.id}`, { token: viewer.tk })).json(),
    );
    expect(pub).toMatchObject({ name: p.name, status: 'published', revision: null });
    const row = await t.prisma.db.project.findUniqueOrThrow({
      where: { id: p.id },
      select: { name: true, status: true },
    });
    expect(row).toEqual({ name: p.name, status: 'published' });
    // Form sửa đọc nội dung bản sửa mở
    const own = projectDetailSchema.parse(
      await (await t.call(`/me/projects/${p.id}`, { token: owner.tk })).json(),
    );
    expect(own).toMatchObject({ name: newName, summary: 'Tóm tắt mới' });
    const mine = (await (await t.call('/me/projects', { token: owner.tk })).json()) as {
      items: { id: string; revision: { status: string } | null }[];
    };
    expect(mine.items.find((i) => i.id === p.id)?.revision?.status).toBe('pending_review');
  });

  it('REQ-106 một bản sửa mở/dự án — sửa lần 2 cập nhật cùng bản', async () => {
    const owner = await member();
    const p = await createProject(t, owner.tk);
    const first = await patch(owner.tk, p.id, { name: `${p.name} a`, submit: false });
    expect(first.status).toBe(200);
    const rev1 = await t.prisma.db.projectRevision.findFirstOrThrow({
      where: { projectId: p.id },
      select: { id: true, status: true },
    });
    expect(rev1.status).toBe('draft');
    expect((await patch(owner.tk, p.id, { name: `${p.name} b` })).status).toBe(200);
    const all = await t.prisma.db.projectRevision.findMany({
      where: { projectId: p.id },
      select: { id: true, status: true, data: true },
    });
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: rev1.id, status: 'pending_review' });
    expect((all[0]?.data as { name: string }).name).toBe(`${p.name} b`);
  });

  it('BUG-033 sửa dự án Bị từ chối → 409; Chờ duyệt lưu nháp vẫn Chờ duyệt', async () => {
    const owner = await member();
    const p = await createProject(t, owner.tk, {}, false);
    const draft = projectCardSchema.parse(
      await (await patch(owner.tk, p.id, { submit: false })).json(),
    );
    expect(draft.status).toBe('pending_review');
    await t.prisma.db.project.update({ where: { id: p.id }, data: { status: 'rejected' } });
    const r = await patch(owner.tk, p.id);
    expect(r.status).toBe(409);
    const n = await t.prisma.db.project.findUniqueOrThrow({
      where: { id: p.id },
      select: { status: true },
    });
    expect(n.status).toBe('rejected');
  });

  it('BUG-038 tab cập nhật theo mốc thật, không còn nội dung cố định', async () => {
    const owner = await member();
    const a = await createProject(t, owner.tk);
    const b = await createProject(t, owner.tk);
    await t.prisma.db.project.update({
      where: { id: b.id },
      data: {
        publishedAt: new Date(Date.UTC(2030, 0, 15, 3)),
        milestones: [
          { at: '2030-01-20T03:00:00.000Z', title: 'Ra mắt bản thử', body: 'b', tone: 'amber' },
          { at: '2030-01-25T03:00:00.000Z', title: 'Đạt 100 người dùng', body: 'b', tone: 'green' },
        ],
      },
    });
    await t.prisma.db.projectRevision.create({
      data: {
        projectId: b.id,
        data: {},
        status: 'approved',
        decidedAt: new Date(Date.UTC(2030, 1, 2, 3)),
      },
    });
    const viewer = await member();
    const get = async (id: string) =>
      projectDetailSchema.parse(
        await (await t.call(`/projects/${id}`, { token: viewer.tk })).json(),
      );
    const da = await get(a.id);
    const db = await get(b.id);
    expect(da.highlights).toEqual([]);
    expect(da.gallery).toEqual([]);
    // mốc duyệt, mốc dự án công bố (mới trước), xuất bản ở cuối (prototype v4)
    expect(db.updates.map((u) => [u.date, u.title])).toEqual([
      ['02/02/2030', 'Cập nhật được duyệt'],
      ['25/01/2030', 'Đạt 100 người dùng'],
      ['20/01/2030', 'Ra mắt bản thử'],
      ['15/01/2030', 'Xuất bản trên OPC Hub'],
    ]);
    // chưa xuất bản → "Tạo dự án"
    const draft = await createProject(t, owner.tk, { submit: false }, false);
    const own = projectDetailSchema.parse(
      await (await t.call(`/me/projects/${draft.id}`, { token: owner.tk })).json(),
    );
    expect(own.updates.map((u) => u.title)).toEqual(['Tạo dự án']);
    expect(da.updates).not.toEqual(db.updates);
    expect(JSON.stringify([da, db])).not.toContain('Ra mắt phiên bản 2.0');
  });

  it('Nhà đầu tư đọc được dự án nhưng không đăng được', async () => {
    const inv = await tokenOf(t, await createUser(t, { accountType: 'investor' }));
    expect((await t.call('/projects?size=5', { token: inv })).status).toBe(200);
    expect(
      (await t.call('/projects', { method: 'POST', token: inv, json: projectBody() })).status,
    ).toBe(403);
  });
});
