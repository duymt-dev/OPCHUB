import { pageSchema } from '@opchub/shared/api';
import { groupItemSchema, joinResultSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const groupPage = pageSchema(groupItemSchema);

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

  it('seed: 34 nhóm, lọc Miền Trung, tìm theo tỉnh, myStatus null với người mới', async () => {
    const token = await member();
    const all = groupPage.parse(await (await t.call('/groups?size=100', { token })).json());
    const seed = all.items.filter((g) => /^c\d+$/.test(g.id));
    expect(seed).toHaveLength(34);
    expect(seed[0]?.id).toBe('c1');
    expect(seed.filter((g) => g.region === 'Miền Trung')).toHaveLength(11);
    expect(seed.find((g) => g.id === 'c4')?.joinMode).toBe('approval');
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
    expect(q.items.map((g) => g.id)).toEqual(['c3']);
    // BR-12: mặc định 12/trang
    expect(groupPage.parse(await (await t.call('/groups', { token })).json()).size).toBe(12);
  });

  it('nhóm mở: join → member +1, join lại → 409, rời → left −1, join lại được', async () => {
    const token = await member();
    const g = await createGroup(t);
    const j = await t.call(`/groups/${g.id}/join`, { method: 'POST', token, json: {} });
    expect(j.status).toBe(201);
    expect(joinResultSchema.parse(await j.json()).status).toBe('member');
    expect(await countOf(g.id)).toBe(1);
    const again = await t.call(`/groups/${g.id}/join`, { method: 'POST', token, json: {} });
    expect(again.status).toBe(409);

    const list = groupPage.parse(await (await t.call('/groups?size=100', { token })).json());
    expect(list.items.find((x) => x.id === g.id)?.myStatus).toBe('member');

    const l = await t.call(`/groups/${g.id}/join`, { method: 'DELETE', token });
    expect(joinResultSchema.parse(await l.json()).status).toBe('left');
    expect(await countOf(g.id)).toBe(0);
    expect((await t.call(`/groups/${g.id}/join`, { method: 'DELETE', token })).status).toBe(404);
    expect((await t.call(`/groups/${g.id}/join`, { method: 'POST', token, json: {} })).status).toBe(
      201,
    );
  });

  it('nhóm duyệt: thiếu intro → 409, có intro → pending + outbox, huỷ → cancelled', async () => {
    const token = await member();
    const g = await createGroup(t, { joinMode: 'approval' });
    const no = await t.call(`/groups/${g.id}/join`, { method: 'POST', token, json: {} });
    expect(no.status).toBe(409);
    expect(((await no.json()) as { error: { message: string } }).error.message).toBe(
      'Nhóm này cần lời giới thiệu để duyệt',
    );
    const j = await t.call(`/groups/${g.id}/join`, {
      method: 'POST',
      token,
      json: { intro: 'Mình làm thiết kế' },
    });
    expect(joinResultSchema.parse(await j.json()).status).toBe('pending');
    expect(await countOf(g.id)).toBe(0);
    const evt = await t.prisma.db.outboxEvent.count({
      where: { type: 'group.join_requested', payload: { path: ['groupId'], equals: g.id } },
    });
    expect(evt).toBe(1);
    const c = await t.call(`/groups/${g.id}/join`, { method: 'DELETE', token });
    expect(joinResultSchema.parse(await c.json()).status).toBe('cancelled');
  });

  it('nhóm không tồn tại → 404; chưa đóng phí → 402', async () => {
    const token = await member();
    const r = await t.call('/groups/khong-co/join', { method: 'POST', token, json: {} });
    expect(r.status).toBe(404);
    const unpaid = await tokenOf(t, await createUser(t, { fee: 'pending_payment' }));
    expect((await t.call('/groups', { token: unpaid })).status).toBe(402);
  });
});
