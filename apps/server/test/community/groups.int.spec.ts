import { pageSchema } from '@opchub/shared/api';
import { groupItemSchema, joinResultSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const groupPage = pageSchema(groupItemSchema);

/** Văn bản SQL của lời gọi `$queryRaw` (Prisma.sql → `.sql`, template → chuỗi nối) */
const sqlOf = (q: unknown): string =>
  q && typeof q === 'object' && 'sql' in q ? String(q.sql) : JSON.stringify(q);

describe('Nhóm cộng đồng Portal (TIP-B20)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  const member = async () => tokenOf(t, await createUser(t, { fee: 'active' }));
  const countOf = async (id: string) =>
    (await t.prisma.db.group.findUniqueOrThrow({ where: { id }, select: { memberCount: true } }))
      .memberCount;

  it('seed: 90 nhóm (34 tỉnh + 56 ngành), lọc Miền Trung, tìm theo tỉnh, myStatus null với người mới', async () => {
    const token = await member();
    const all = groupPage.parse(await (await t.call('/groups?size=100', { token })).json());
    const seed = all.items.filter((g) => /^c\d+$/.test(g.id));
    expect(seed).toHaveLength(34);
    expect(seed.every((g) => g.kind === 'province' && g.parentId === null)).toBe(true);
    // D-89 (prototype v4): nhóm ngành thuộc nhóm tỉnh cùng tỉnh
    const ind = all.items.filter((g) => /^g\d+$/.test(g.id));
    expect(ind).toHaveLength(56);
    expect(ind.find((g) => g.id === 'g1')).toMatchObject({
      kind: 'industry',
      industry: 'Công nghệ & AI',
      parentId: 'c1',
      province: 'Hà Nội',
    });
    expect(seed[0]?.id).toBe('c1');
    expect(seed.filter((g) => g.region === 'Miền Trung')).toHaveLength(11);
    expect(seed.find((g) => g.id === 'c4')).not.toHaveProperty('joinMode');
    expect(seed.every((g) => g.myStatus === null)).toBe(true);

    const mid = groupPage.parse(
      await (
        await t.call(`/groups?size=100&region=${encodeURIComponent('Miền Trung')}`, { token })
      ).json(),
    );
    expect(mid.items.every((g) => g.region === 'Miền Trung')).toBe(true);
    const q = groupPage.parse(
      await (await t.call(`/groups?q=${encodeURIComponent('đà nẵng')}`, { token })).json(),
    );
    expect(q.items.map((g) => g.id)).toContain('c3');
    expect(q.items.every((g) => g.province === 'Đà Nẵng')).toBe(true);
    // BR-12: mặc định 12/trang
    expect(groupPage.parse(await (await t.call('/groups', { token })).json()).size).toBe(12);
  });

  it('REQ-382 tham gia nhóm: thiếu agreeRules → 400; có → ghi consent fee_policy một lần', async () => {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(t, u);
    const g = await createGroup(t);
    const g2 = await createGroup(t);
    const no = await t.call(`/groups/${g.id}/join`, { method: 'POST', token, json: {} });
    expect(no.status).toBe(400);
    expect(await countOf(g.id)).toBe(0);
    for (const x of [g, g2]) {
      const ok = await t.call(`/groups/${x.id}/join`, {
        method: 'POST',
        token,
        json: { agreeRules: true },
      });
      expect(ok.status).toBe(201);
    }
    expect(await t.prisma.db.consent.count({ where: { userId: u.id, kind: 'fee_policy' } })).toBe(
      1,
    );
  });

  it('D-71 join → member +1 + outbox group.joined, join lại → 409, rời → left −1, join lại được', async () => {
    const token = await member();
    const g = await createGroup(t);
    const j = await t.call(`/groups/${g.id}/join`, {
      method: 'POST',
      token,
      json: { agreeRules: true },
    });
    expect(j.status).toBe(201);
    expect(joinResultSchema.parse(await j.json()).status).toBe('member');
    expect(await countOf(g.id)).toBe(1);
    const joined = await t.prisma.db.outboxEvent.count({
      where: { type: 'group.joined', payload: { path: ['groupId'], equals: g.id } },
    });
    expect(joined).toBe(1);
    const again = await t.call(`/groups/${g.id}/join`, {
      method: 'POST',
      token,
      json: { agreeRules: true },
    });
    expect(again.status).toBe(409);

    const list = groupPage.parse(await (await t.call('/groups?size=100', { token })).json());
    expect(list.items.find((x) => x.id === g.id)?.myStatus).toBe('member');

    const l = await t.call(`/groups/${g.id}/join`, { method: 'DELETE', token });
    expect(joinResultSchema.parse(await l.json()).status).toBe('left');
    expect(await countOf(g.id)).toBe(0);
    expect((await t.call(`/groups/${g.id}/join`, { method: 'DELETE', token })).status).toBe(404);
    expect(
      (await t.call(`/groups/${g.id}/join`, { method: 'POST', token, json: { agreeRules: true } }))
        .status,
    ).toBe(201);
  });

  it('D-71 lời giới thiệu không bắt buộc: có intro vẫn vào ngay, lưu intro', async () => {
    const u = await createUser(t, { fee: 'active' });
    const g = await createGroup(t);
    const j = await t.call(`/groups/${g.id}/join`, {
      method: 'POST',
      token: await tokenOf(t, u),
      json: { intro: 'Mình làm thiết kế', agreeRules: true },
    });
    expect(joinResultSchema.parse(await j.json()).status).toBe('member');
    const row = await t.prisma.db.groupMember.findUniqueOrThrow({
      where: { groupId_userId: { groupId: g.id, userId: u.id } },
      select: { status: true, intro: true },
    });
    expect(row).toEqual({ status: 'member', intro: 'Mình làm thiết kế' });
  });

  it('nhóm không tồn tại → 404; chưa đóng phí → 402', async () => {
    const token = await member();
    const r = await t.call('/groups/khong-co/join', {
      method: 'POST',
      token,
      json: { agreeRules: true },
    });
    expect(r.status).toBe(404);
    const unpaid = await tokenOf(t, await createUser(t, { fee: 'pending_payment' }));
    expect((await t.call('/groups', { token: unpaid })).status).toBe(402);
  });

  it('BUG-011 danh sách trả coverUrl + avatars ≤4 thật (1 query avatars cho cả trang)', async () => {
    const g = await createGroup(t);
    const cover = 'http://media.local/v1/uploads/group-cover/admin/c.png';
    await t.prisma.db.group.update({ where: { id: g.id }, data: { coverUrl: cover } });
    const g2 = await createGroup(t);
    // 3 thành viên có ảnh + 1 không ảnh + 1 đã rời có ảnh (không tính)
    const urls: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const u = await createUser(t, { fee: 'active' });
      const url = `http://media.local/v1/uploads/avatar/${u.id}/a.png`;
      await t.prisma.db.user.update({ where: { id: u.id }, data: { avatarUrl: url } });
      await addMember(t, g.id, u.id);
      urls.unshift(url);
    }
    await addMember(t, g.id, (await createUser(t, { fee: 'active' })).id);
    const p = await createUser(t, { fee: 'active' });
    await t.prisma.db.user.update({ where: { id: p.id }, data: { avatarUrl: 'http://x/p.png' } });
    await t.prisma.db.groupMember.create({
      data: { groupId: g.id, userId: p.id, status: 'left' },
    });
    // 6 thành viên có ảnh ở nhóm 2 → chỉ 4
    for (let i = 0; i < 6; i += 1) {
      const u = await createUser(t, { fee: 'active' });
      await t.prisma.db.user.update({
        where: { id: u.id },
        data: { avatarUrl: `http://x/${i}.png` },
      });
      await addMember(t, g2.id, u.id);
    }

    const raw = vi.spyOn(t.prisma.db, '$queryRaw');
    const page = groupPage.parse(
      await (await t.call('/groups?size=100', { token: await member() })).json(),
    );
    const avatarQueries = raw.mock.calls.filter((c) => sqlOf(c[0]).includes('avatar_url'));
    raw.mockRestore();
    expect(avatarQueries).toHaveLength(1);
    const item = page.items.find((x) => x.id === g.id);
    expect(item).toMatchObject({ coverUrl: cover });
    // Mới nhất trước (created_at DESC); cùng mốc giờ → thứ tự ổn định nên so tập
    expect(new Set(item?.avatars)).toEqual(new Set(urls));
    expect(page.items.find((x) => x.id === g2.id)?.avatars).toHaveLength(4);
    expect(page.items.find((x) => x.id === 'c1')?.coverUrl).toBeDefined();
  });
});
