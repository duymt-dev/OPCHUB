import { pageSchema } from '@opchub/shared/api';
import {
  chatMessageSchema,
  joinResultSchema,
  notificationListSchema,
  reportSchema,
} from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NotificationEventsHandler } from '@/modules/notification';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { connected, createSocketApp, nextEvent, type SocketTestApp } from '../setup/socket-app';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * Cổng pha B3: cộng đồng → chat realtime → kiểm duyệt → thông báo qua process api + socket thật.
 * Xin vào nhóm cần duyệt → chủ nhóm duyệt (tin hệ thống + thông báo) → vào phòng qua socket →
 * @nhắc (thông báo) → báo cáo → Admin ẩn tin → tin biến khỏi lịch sử.
 */
describe('Cổng B3: cộng đồng + chat + kiểm duyệt + thông báo', () => {
  let t: TestApp;
  let s: SocketTestApp;

  beforeAll(async () => {
    t = await createTestApp();
    s = await createSocketApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    await s.close();
    await removeTestGroups(t);
    await t.close();
  });

  it('vào nhóm ngay (D-71) → chào → chat socket → @nhắc → báo cáo → ẩn', async () => {
    const g = await createGroup(t, { name: 'Nhóm Cổng B3' });
    const room = `${g.id}-general`;
    const owner = await createUser(t, { fee: 'active' });
    const newbie = await createUser(t, { fee: 'active' });
    await addMember(t, g.id, owner.id, 'owner');
    const ownerTk = await tokenOf(t, owner);
    const newTk = await tokenOf(t, newbie);
    const handler = t.app.get(NotificationEventsHandler);
    /** Mô phỏng relay worker cho sự kiện vào nhóm của nhóm này */
    const drainJoined = async () => {
      const evs = await t.prisma.db.outboxEvent.findMany({
        where: { type: 'group.joined', payload: { path: ['groupId'], equals: g.id } },
        select: { payload: true },
      });
      for (const e of evs) {
        await handler.groupJoined(parseOutboxPayload('group.joined', e.payload));
      }
    };

    // 1. Chưa vào nhóm → không đọc được phòng
    const blocked = await t.call(`/rooms/${room}/messages`, { token: newTk });
    expect(blocked.status).toBe(403);

    // 2. Đã đóng phí → vào nhóm ngay (D-71) + thông báo chào
    const join = await t.call(`/groups/${g.id}/join`, {
      method: 'POST',
      token: newTk,
      json: { intro: 'Mình làm thiết kế', agreeRules: true },
    });
    expect(joinResultSchema.parse(await join.json()).status).toBe('member');
    await drainJoined();
    const box = notificationListSchema.parse(
      await (await t.call('/notifications', { token: newTk })).json(),
    );
    expect(box.items[0]?.title).toBe('Chào mừng bạn đến với Nhóm Cổng B3!');

    // 3. Cả hai vào phòng qua socket; người mới @nhắc chủ nhóm
    const so = s.connect(ownerTk);
    const sn = s.connect(newTk);
    await Promise.all([connected(so), connected(sn)]);
    for (const c of [so, sn]) {
      expect(((await c.emitWithAck('room.join', { roomId: room })) as { ok: boolean }).ok).toBe(
        true,
      );
    }
    const pushed = nextEvent<unknown>(so, 'message.new');
    const ack = (await sn.emitWithAck('message.send', {
      roomId: room,
      clientMsgId: randomUUID(),
      body: '@Chủ nhóm ơi, ai cần vay nóng không?',
      mentions: [owner.id],
    })) as { ok: true; data: unknown };
    const msg = chatMessageSchema.parse(ack.data);
    expect(chatMessageSchema.parse(await pushed).id).toBe(msg.id);
    const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'chat.mentioned', payload: { path: ['messageId'], equals: msg.id } },
      select: { payload: true },
    });
    await handler.chatMentioned(parseOutboxPayload('chat.mentioned', ev.payload));
    const ownerBox = notificationListSchema.parse(
      await (await t.call('/notifications', { token: ownerTk })).json(),
    );
    expect(ownerBox.items[0]).toMatchObject({ type: 'mention', link: `/chat/${g.id}` });

    // 4. Chủ nhóm báo cáo → tin ẩn ngay (V4-612, D-77) → Admin xử lý → người mới chỉ thấy dòng giữ chỗ
    const rep = reportSchema.parse(
      await (
        await t.call(`/messages/${msg.id}/report`, {
          method: 'POST',
          token: ownerTk,
          json: { reason: 'scam' },
        })
      ).json(),
    );
    const admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const queue = pageSchema(reportSchema).parse(
      await (await t.call('/admin/reports?status=open&size=100', { token: admin })).json(),
    );
    expect(queue.items.some((r) => r.id === rep.id)).toBe(true);
    const hide = await t.call(`/admin/reports/${rep.id}/action`, {
      method: 'POST',
      token: admin,
      json: { action: 'hide' },
    });
    expect(hide.status).toBe(200);
    const hist = (await (await t.call(`/rooms/${room}/messages`, { token: newTk })).json()) as {
      items: { id: string; body: string; hiddenAt?: string | null }[];
    };
    // D-71: vào thẳng không có tin hệ thống "được duyệt" → chỉ còn tin đã ẩn, không lộ nội dung
    expect(hist.items).toHaveLength(1);
    expect(hist.items[0]).toMatchObject({ id: msg.id, body: '' });
    expect(hist.items[0]?.hiddenAt).toBeTruthy();
  });
});
