import {
  chatMessageSchema,
  notificationListSchema,
  notificationReadResultSchema,
} from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NotificationEventsHandler, NotificationService } from '@/modules/notification';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('Thông báo cá nhân (TIP-B25)', () => {
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

  const inbox = async (token: string, q = '') =>
    notificationListSchema.parse(await (await t.call(`/notifications${q}`, { token })).json());

  it('hộp thư: mới trước, keyset cursor, unread đếm tất cả; read ids/all; ids người khác không đổi', async () => {
    const u = await createUser(t, { fee: 'pending_payment' });
    const other = await createUser(t, { fee: 'active' });
    const svc = t.app.get(NotificationService);
    for (const i of [1, 2, 3]) {
      await svc.notify([{ userId: u.id, type: 'group', title: `T${i}`, body: '', link: '/' }]);
    }
    await svc.notify([
      { userId: other.id, type: 'group', title: 'Của người khác', body: '', link: '/' },
    ]);
    // Không paywall: user chưa đóng phí vẫn đọc được
    const token = await tokenOf(t, u);
    const p1 = await inbox(token, '?size=2');
    expect(p1.items.map((n) => n.title)).toEqual(['T3', 'T2']);
    expect(p1.unread).toBe(3);
    const p2 = await inbox(token, `?size=2&cursor=${p1.nextCursor ?? ''}`);
    expect(p2.items.map((n) => n.title)).toEqual(['T1']);
    expect(p2.nextCursor).toBeNull();

    const otherId = (await inbox(await tokenOf(t, other))).items[0]?.id ?? '';
    const r1 = await t.call('/notifications/read', {
      method: 'POST',
      token,
      json: { ids: [p1.items[0]?.id ?? '', otherId] },
    });
    expect(notificationReadResultSchema.parse(await r1.json()).unread).toBe(2);
    expect((await inbox(await tokenOf(t, other))).unread).toBe(1);
    const all = await t.call('/notifications/read', { method: 'POST', token, json: {} });
    expect(notificationReadResultSchema.parse(await all.json()).unread).toBe(0);
  });

  it('@nhắc + trả lời trong chat → outbox → thông báo mention cho đúng người, link phòng; không cho cả phòng', async () => {
    const g = await createGroup(t);
    const room = `${g.id}-general`;
    const [a, b, c] = await Promise.all([
      createUser(t, { fee: 'active' }),
      createUser(t, { fee: 'active' }),
      createUser(t, { fee: 'active' }),
    ]);
    for (const u of [a, b, c]) await addMember(t, g.id, u.id);
    const aTk = await tokenOf(t, a);
    const bTk = await tokenOf(t, b);
    const post = (token: string, body: Record<string, unknown>) =>
      t.call(`/rooms/${room}/messages`, {
        method: 'POST',
        token,
        json: { clientMsgId: randomUUID(), ...body },
      });
    const first = chatMessageSchema.parse(await (await post(bTk, { body: 'Câu hỏi' })).json());
    await post(aTk, { body: '@B xem nhé', mentions: [b.id] });
    await post(aTk, { body: 'Trả lời đây', replyTo: first.id });

    const handler = t.app.get(NotificationEventsHandler);
    const events = await t.prisma.db.outboxEvent.findMany({
      where: { type: 'chat.mentioned', payload: { path: ['roomId'], equals: room } },
      select: { payload: true },
      orderBy: { id: 'asc' },
    });
    expect(events).toHaveLength(2);
    for (const e of events)
      await handler.chatMentioned(parseOutboxPayload('chat.mentioned', e.payload));

    const bBox = await inbox(bTk);
    expect(bBox.items.map((n) => n.type)).toEqual(['mention', 'mention']);
    expect(bBox.items[0]?.title).toMatch(/trả lời bạn trong #Chung$/);
    expect(bBox.items[1]?.title).toMatch(/nhắc đến bạn trong #Chung$/);
    expect(bBox.items[0]?.link).toBe(`/chat/${g.id}`);
    expect((await inbox(await tokenOf(t, c))).items).toHaveLength(0);
  });

  it('duyệt vào nhóm → thông báo group; cảnh báo kiểm duyệt; phí kích hoạt → membership', async () => {
    const g = await createGroup(t, { name: 'Nhóm Duyệt' });
    const u = await createUser(t, { fee: 'active' });
    const h = t.app.get(NotificationEventsHandler);
    await h.joinDecided({ groupId: g.id, userId: u.id, decision: 'approve' });
    await h.warned({ userId: u.id, messageId: 'x', roomId: `${g.id}-general` });
    await h.feeActivated({
      userId: u.id,
      status: 'active',
      validUntil: '2027-10-17T00:00:00.000Z',
    });
    const box = await inbox(await tokenOf(t, u));
    expect(box.items.map((n) => [n.type, n.title])).toEqual([
      ['membership', 'Đã ghi nhận phí thành viên'],
      ['group', 'Tin nhắn của bạn vi phạm nội quy nhóm'],
      ['group', 'Yêu cầu tham gia Nhóm Duyệt đã được duyệt'],
    ]);
    expect(box.items[2]?.link).toBe(`/chat/${g.id}`);
    expect(box.items[0]?.body).toBe('Thẻ thành viên có hiệu lực đến 17/10/2027.');
  });

  it('REQ-210 NA-10 giữ 50 thông báo gần nhất mỗi người; người khác không bị cắt', async () => {
    const u = await createUser(t, { fee: 'active' });
    const other = await createUser(t, { fee: 'active' });
    const svc = t.app.get(NotificationService);
    const item = (userId: string, i: number) => ({
      userId,
      type: 'group' as const,
      title: `Thông báo ${i}`,
      body: '',
      link: '/dashboard',
    });
    await svc.notify([item(other.id, 0)]);
    for (let i = 0; i < 5; i++) {
      await svc.notify(Array.from({ length: 11 }, (_, k) => item(u.id, i * 11 + k)));
    }
    expect(await t.prisma.db.notification.count({ where: { userId: u.id } })).toBe(50);
    expect(await t.prisma.db.notification.count({ where: { userId: other.id } })).toBe(1);
    const tk = await tokenOf(t, u);
    const box = await inbox(tk, '?size=50');
    // 5 bản cũ nhất (0–4) bị xoá, bản mới nhất còn
    expect(box.items.some((n) => n.title === 'Thông báo 54')).toBe(true);
    expect(box.items.some((n) => n.title === 'Thông báo 0')).toBe(false);
  });

  it('BUG-023 link thông báo phí = /dashboard', async () => {
    const u = await createUser(t, { fee: 'active' });
    const h = t.app.get(NotificationEventsHandler);
    await h.feeActivated({ userId: u.id, status: 'active', validUntil: null });
    const box = await inbox(await tokenOf(t, u));
    expect(box.items[0]?.type).toBe('membership');
    expect(box.items[0]?.link).toBe('/dashboard');
  });
});
