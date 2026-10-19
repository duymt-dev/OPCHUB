import { pageSchema } from '@opchub/shared/api';
import {
  adminInvestorSchema,
  investorCommentSchema,
  investorInterestSchema,
  investorThreadSchema,
  notificationListSchema,
} from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { InvestorNotifyHandler } from '@/modules/investor';
import { tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const FUNDING = {
  amount: 2_000_000_000,
  currency: 'VND' as const,
  equityPercent: 10,
  minTicket: 0,
};
const TITLE = 'OPC Hub đã phản hồi quan tâm đầu tư của bạn';
const threads = z.object({ items: z.array(investorThreadSchema) });
const comments = z.object({ items: z.array(investorCommentSchema) });

/** TIP-V2-107: một luồng trao đổi NĐT ↔ OPC Hub (IV-R01…R03, BUG-006, NA-11) */
describe('Luồng trao đổi nhà đầu tư (TIP-V2-107)', () => {
  let t: TestApp;
  let admin: string;
  let owner: string;
  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    owner = await tokenOf(t, await createUser(t, { fee: 'active' }));
  });
  afterAll(async () => {
    await removeTestProjects(t);
    await t.close();
  });

  const invest = async (tk: string, projectId: string, amount = 500_000_000) =>
    investorInterestSchema.parse(
      await (
        await t.call(`/projects/${projectId}/interest`, {
          method: 'POST',
          token: tk,
          headers: { 'Idempotency-Key': randomUUID() },
          json: {
            kind: 'individual',
            contactName: 'NĐT thử',
            phone: '0912345678',
            amount,
            message: 'Quan tâm',
          },
        })
      ).json(),
    );
  const adminSay = (key: string, body: string) =>
    t.call(`/admin/investors/${key}/comments`, { method: 'POST', token: admin, json: { body } });
  const nameOf = async (id: string) =>
    (await t.prisma.db.user.findUniqueOrThrow({ where: { id }, select: { fullName: true } }))
      .fullName;
  const myThread = async (tk: string) =>
    threads.parse(await (await t.call('/me/investor-thread', { token: tk })).json()).items;
  /** Relay outbox: chạy consumer cho các sự kiện `investor.admin_replied` của NĐT này */
  const relay = async (investorKey: string) => {
    const evs = await t.prisma.db.outboxEvent.findMany({
      where: {
        type: 'investor.admin_replied',
        payload: { path: ['investorKey'], equals: investorKey },
      },
      select: { payload: true },
      orderBy: { id: 'asc' },
    });
    const h = t.app.get(InvestorNotifyHandler);
    for (const e of evs)
      await h.adminReplied(parseOutboxPayload('investor.admin_replied', e.payload));
    return evs.length;
  };

  it('AT-IV01 REQ-371 Admin gửi → NĐT nhận thông báo invest + thấy tin ở /me/investor-thread', async () => {
    const p = await createProject(t, owner, { funding: FUNDING });
    const invU = await createUser(t, { accountType: 'investor' });
    const inv = await tokenOf(t, invU);
    const i = await invest(inv, p.id);
    const body = `<b>Chào anh</b>, OPC Hub đã nhận quan tâm của anh. ${'x'.repeat(120)}`;
    expect((await adminSay(i.id, body)).status).toBe(201);
    // Chuỗi thường bỏ thẻ ở biên server (TIP-V2-103)
    const plain = `Chào anh, OPC Hub đã nhận quan tâm của anh. ${'x'.repeat(120)}`;

    expect(await relay(invU.id)).toBe(1);
    const n = notificationListSchema.parse(
      await (await t.call('/notifications', { token: inv })).json(),
    );
    expect(n.items[0]).toMatchObject({ type: 'invest', title: TITLE, link: `/projects/${p.id}` });
    expect(n.items[0]?.body).toBe(
      `Chào anh, OPC Hub đã nhận quan tâm của anh. ${'x'.repeat(120)}`.slice(0, 90),
    );

    const [th] = await myThread(inv);
    expect(th).toMatchObject({ key: i.id, projectId: p.id, counterpartName: 'Admin OPC Hub' });
    expect(th?.messages.map((m) => [m.senderName, m.fromInvestor, m.body])).toEqual([
      ['Admin OPC Hub', false, plain],
    ]);

    // Relay chạy lại (at-least-once): chấp nhận trùng thông báo theo quy ước NotificationService
    await relay(invU.id);
    expect(
      await t.prisma.db.notification.count({ where: { userId: invU.id, type: 'invest' } }),
    ).toBe(2);
  });

  it('UAT-20 REQ-372 NĐT trả lời → Admin thấy cùng luồng', async () => {
    const p = await createProject(t, owner, { funding: FUNDING });
    const invU = await createUser(t, { accountType: 'investor' });
    const inv = await tokenOf(t, invU);
    const i = await invest(inv, p.id);
    expect((await adminSay(i.id, 'Chào anh')).status).toBe(201);
    const r = await t.call(`/investor-thread/${i.id}/messages`, {
      method: 'POST',
      token: inv,
      json: { body: 'Cảm ơn OPC Hub' },
    });
    expect(r.status).toBe(201);
    const list = comments.parse(
      await (await t.call(`/admin/investors/${i.id}/comments`, { token: admin })).json(),
    );
    expect(list.items.map((c) => [c.authorName, c.fromInvestor, c.body])).toEqual([
      ['Admin OPC Hub', false, 'Chào anh'],
      [await nameOf(invU.id), true, 'Cảm ơn OPC Hub'],
    ]);
    // Tin NĐT không tạo thông báo (§12)
    expect(await relay(invU.id)).toBe(1);
  });

  it('REQ-373 tin Admin đầu tiên → Đang trao đổi, tin sau không đổi', async () => {
    const p = await createProject(t, owner, { funding: FUNDING });
    const invU = await createUser(t, { accountType: 'investor' });
    const i = await invest(await tokenOf(t, invU), p.id);
    const statusNow = async () =>
      adminInvestorSchema.parse(
        await (await t.call(`/admin/investors/${i.id}`, { token: admin })).json(),
      );
    expect((await statusNow()).status).toBe('sent');
    await adminSay(i.id, 'Tin 1');
    expect(await statusNow()).toMatchObject({ status: 'in_discussion', commentCount: 1 });
    await t.call(`/admin/investors/${i.id}/status`, {
      method: 'PATCH',
      token: admin,
      json: { status: 'connected' },
    });
    await adminSay(i.id, 'Tin 2');
    expect(await statusNow()).toMatchObject({ status: 'connected', commentCount: 2 });
  });

  it('REQ-211 NĐT 2 dự án → một luồng, tổng vốn cộng', async () => {
    const p1 = await createProject(t, owner, { funding: FUNDING });
    const p2 = await createProject(t, owner, { funding: FUNDING });
    const invU = await createUser(t, { accountType: 'investor' });
    const inv = await tokenOf(t, invU);
    const a = await invest(inv, p1.id, 300_000_000);
    const b = await invest(inv, p2.id, 200_000_000);

    const send = (key: string, body: string) =>
      t.call(`/investor-thread/${key}/messages`, { method: 'POST', token: inv, json: { body } });
    expect((await send(a.id, 'Từ trang P1')).status).toBe(201);
    expect((await send(b.id, 'Từ trang P2')).status).toBe(201);
    await adminSay(b.id, 'Admin trả lời');

    const items = await myThread(inv);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ key: a.id, projectId: p1.id });
    expect(items[0]?.messages.map((m) => m.body)).toEqual([
      'Từ trang P1',
      'Từ trang P2',
      'Admin trả lời',
    ]);

    const page = pageSchema(adminInvestorSchema).parse(
      await (await t.call('/admin/investors?size=100', { token: admin })).json(),
    );
    const rows = page.items.filter((r) => r.key === a.id || r.key === b.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: a.id, totalAmount: 500_000_000, commentCount: 3 });
    expect(rows[0]?.items).toHaveLength(2);
  });

  it('REQ-372 chủ dự án / người ngoài gửi → 404', async () => {
    const p = await createProject(t, owner, { funding: FUNDING });
    const invU = await createUser(t, { accountType: 'investor' });
    const i = await invest(await tokenOf(t, invU), p.id);
    const stranger = await tokenOf(t, await createUser(t, { fee: 'active' }));
    for (const tk of [owner, stranger]) {
      const r = await t.call(`/investor-thread/${i.id}/messages`, {
        method: 'POST',
        token: tk,
        json: { body: 'Chen vào' },
      });
      expect(r.status).toBe(404);
    }
    expect(await t.prisma.db.investorComment.count({ where: { investorKey: invU.id } })).toBe(0);
  });
});
