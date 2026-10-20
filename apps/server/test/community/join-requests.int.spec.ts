import { joinRequestSchema, joinResultSchema } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { JoinRequestService } from '@/modules/community';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const listSchema = z.object({ items: z.array(joinRequestSchema) });

describe('Yêu cầu vào nhóm — chủ nhóm duyệt (TIP-B21)', () => {
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

  /** Nhóm duyệt có chủ nhóm + 2 người gửi yêu cầu theo thứ tự */
  async function setup() {
    const g = await createGroup(t, { joinMode: 'approval' });
    const owner = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, owner.id, 'owner');
    const a = await createUser(t, { fee: 'active' });
    const b = await createUser(t, { fee: 'active' });
    for (const u of [a, b]) {
      const r = await t.call(`/groups/${g.id}/join`, {
        method: 'POST',
        token: await tokenOf(t, u),
        json: { intro: `Xin vào ${u.id}`, agreeRules: true },
      });
      expect(r.status).toBe(201);
    }
    return { g, owner, a, b, ownerToken: await tokenOf(t, owner) };
  }

  it('chủ nhóm thấy yêu cầu theo thứ tự gửi; thành viên thường → 403', async () => {
    const { g, a, b, ownerToken } = await setup();
    const list = listSchema.parse(
      await (await t.call(`/groups/${g.id}/requests`, { token: ownerToken })).json(),
    );
    expect(list.items.map((r) => r.userId)).toEqual([a.id, b.id]);
    expect(list.items[0]?.intro).toBe(`Xin vào ${a.id}`);

    const plain = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, plain.id);
    const r = await t.call(`/groups/${g.id}/requests`, { token: await tokenOf(t, plain) });
    expect(r.status).toBe(403);
  });

  it('approve: member + member_count+1 + tin hệ thống + outbox; approve lại → 404', async () => {
    const { g, a, ownerToken } = await setup();
    const before = (await t.prisma.db.group.findUniqueOrThrow({ where: { id: g.id } })).memberCount;
    const path = `/groups/${g.id}/requests/${a.id}/approve`;
    const r = await t.call(path, { method: 'POST', token: ownerToken });
    expect(r.status).toBe(200);
    expect(joinResultSchema.parse(await r.json())).toEqual({ groupId: g.id, status: 'member' });
    const after = await t.prisma.db.group.findUniqueOrThrow({ where: { id: g.id } });
    expect(after.memberCount).toBe(before + 1);
    const msg = await t.prisma.db.message.findFirstOrThrow({
      where: { roomId: `${g.id}-general`, senderId: null },
      select: { body: true },
    });
    expect(msg.body).toMatch(/vừa được duyệt vào nhóm\. Chào mừng bạn!$/);
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'group.request_decided', payload: { path: ['userId'], equals: a.id } },
      }),
    ).toBe(1);
    expect((await t.call(path, { method: 'POST', token: ownerToken })).status).toBe(404);
  });

  it('reject → rejected, người đó gửi lại được; quyết định lạ → 404', async () => {
    const { g, b, ownerToken } = await setup();
    const r = await t.call(`/groups/${g.id}/requests/${b.id}/reject`, {
      method: 'POST',
      token: ownerToken,
    });
    expect(joinResultSchema.parse(await r.json()).status).toBe('rejected');
    const again = await t.call(`/groups/${g.id}/join`, {
      method: 'POST',
      token: await tokenOf(t, b),
      json: { intro: 'Lần 2', agreeRules: true },
    });
    expect(joinResultSchema.parse(await again.json()).status).toBe('pending');
    const odd = await t.call(`/groups/${g.id}/requests/${b.id}/xoa`, {
      method: 'POST',
      token: ownerToken,
    });
    expect(odd.status).toBe(404);
  });

  it('GR-R02 REQ-362 Giảng viên trong nhóm không xem/duyệt được yêu cầu (404/403)', async () => {
    const { g, a } = await setup();
    const lec = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, lec.id, 'lecturer');
    const tk = await tokenOf(t, lec);
    expect((await t.call(`/groups/${g.id}/requests`, { token: tk })).status).toBe(403);
    const ok = await t.call(`/groups/${g.id}/requests/${a.id}/approve`, {
      method: 'POST',
      token: tk,
    });
    expect([403, 404]).toContain(ok.status);
  });

  it('admin c.mod duyệt được mọi nhóm; outbox join_requested → member.request tới chủ nhóm', async () => {
    const { g, owner, b } = await setup();
    const mod = await tokenOf(t, await createUser(t, { systemRole: 'moderator', fee: 'active' }));
    const list = listSchema.parse(
      await (await t.call(`/groups/${g.id}/requests`, { token: mod })).json(),
    );
    expect(list.items).toHaveLength(2);

    const sub = t.redis.duplicate();
    const got: string[] = [];
    await sub.subscribe('socket:user');
    sub.on('message', (_c, m) => got.push(m));
    const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'group.join_requested', payload: { path: ['userId'], equals: b.id } },
      select: { payload: true },
    });
    await t.app
      .get(JoinRequestService)
      .notifyOwners(parseOutboxPayload('group.join_requested', ev.payload));
    await new Promise((res) => setTimeout(res, 100));
    expect(got.some((m) => m.includes(owner.id) && m.includes('member.request'))).toBe(true);
    await sub.quit();
  });
});
