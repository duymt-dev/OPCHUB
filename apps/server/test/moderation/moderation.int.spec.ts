import { pageSchema } from '@opchub/shared/api';
import {
  chatMessagePageSchema,
  chatMessageSchema,
  keywordListSchema,
  reportSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ReportService } from '@/modules/moderation';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('Kiểm duyệt: báo cáo tin, từ khoá, Admin xử lý (TIP-B24)', () => {
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

  async function setup() {
    const g = await createGroup(t);
    const room = `${g.id}-general`;
    const [sender, a, b] = await Promise.all([
      createUser(t, { fee: 'active' }),
      createUser(t, { fee: 'active' }),
      createUser(t, { fee: 'active' }),
    ]);
    for (const u of [sender, a, b]) await addMember(t, g.id, u.id);
    const senderTk = await tokenOf(t, sender);
    const send = async (body: string) =>
      chatMessageSchema.parse(
        await (
          await t.call(`/rooms/${room}/messages`, {
            method: 'POST',
            token: senderTk,
            json: { clientMsgId: randomUUID(), body },
          })
        ).json(),
      );
    return { g, room, sender, senderTk, aTk: await tokenOf(t, a), bTk: await tokenOf(t, b), send };
  }
  const report = (token: string, id: string) =>
    t.call(`/messages/${id}/report`, { method: 'POST', token, json: { reason: 'scam' } });
  const adminTk = async () => tokenOf(t, await createUser(t, { systemRole: 'admin' }));

  it('báo cáo: 2 người → 1 ca reporterCount 2; báo lại 409; tin của mình 403; reportedByMe', async () => {
    const { room, senderTk, aTk, bTk, send } = await setup();
    const m = await send('Bán hàng giá rẻ');
    const r1 = await report(aTk, m.id);
    expect(r1.status).toBe(201);
    expect(reportSchema.parse(await r1.json())).toMatchObject({
      source: 'report',
      reporterCount: 1,
      status: 'open',
    });
    expect(reportSchema.parse(await (await report(bTk, m.id)).json()).reporterCount).toBe(2);
    const again = await report(aTk, m.id);
    expect(again.status).toBe(409);
    expect(((await again.json()) as { error: { message: string } }).error.message).toBe(
      'Bạn đã báo cáo tin này',
    );
    expect((await report(senderTk, m.id)).status).toBe(403);
    const page = chatMessagePageSchema.parse(
      await (await t.call(`/rooms/${room}/messages`, { token: aTk })).json(),
    );
    expect(page.items.find((x) => x.id === m.id)?.reportedByMe).toBe(true);
  });

  it('từ khoá: tin chứa "vay nóng" → job tạo ca auto có hit, chạy lại không nhân đôi', async () => {
    const { send } = await setup();
    const m = await send('Ai cần VAY NÓNG liên hệ mình');
    // Hook sau commit đã enqueue job (jobId kw-<id>) — kiểm khoá BullMQ trong Redis
    const jobKey = `opchub:bull:moderation:kw-${m.id}`;
    const raw = t.redis.duplicate({ prefix: '' });
    expect(await raw.exists(jobKey)).toBe(1);
    await raw.quit();
    const svc = t.app.get(ReportService);
    await svc.keywordHit(m.id, 'VAY NÓNG');
    await svc.keywordHit(m.id, 'VAY NÓNG');
    const cases = await t.prisma.db.report.findMany({
      where: { messageId: m.id },
      select: { source: true, hit: true, status: true },
    });
    expect(cases).toEqual([{ source: 'auto', hit: 'VAY NÓNG', status: 'open' }]);
    const admin = await adminTk();
    const list = pageSchema(reportSchema).parse(
      await (await t.call('/admin/reports?status=open&size=100', { token: admin })).json(),
    );
    expect(list.items.find((r) => r.hit === 'VAY NÓNG')?.reason).toBe('scam');
  });

  it('admin hide: tin biến khỏi lịch sử Portal, ca resolved; xử lý lần 2 → 409; audit', async () => {
    const { room, aTk, send } = await setup();
    const m = await send('Nội dung xấu');
    const rep = reportSchema.parse(await (await report(aTk, m.id)).json());
    const admin = await adminTk();
    const act = (action: string) =>
      t.call(`/admin/reports/${rep.id}/action`, { method: 'POST', token: admin, json: { action } });
    const r = await act('hide');
    expect(r.status).toBe(200);
    expect(reportSchema.parse(await r.json()).status).toBe('resolved');
    expect((await act('dismiss')).status).toBe(409);
    const page = chatMessagePageSchema.parse(
      await (await t.call(`/rooms/${room}/messages`, { token: aTk })).json(),
    );
    expect(page.items.some((x) => x.id === m.id)).toBe(false);
    expect(
      await t.prisma.db.auditLog.count({ where: { action: 'moderation.hide', entityId: rep.id } }),
    ).toBe(1);
  });

  it('admin warn → outbox moderation.warned; lock → khoá người gửi; member thường → 403', async () => {
    const { sender, aTk, bTk, send } = await setup();
    expect((await t.call('/admin/reports', { token: aTk })).status).toBe(403);
    const admin = await adminTk();
    const m1 = await send('tin 1');
    const r1 = reportSchema.parse(await (await report(aTk, m1.id)).json());
    await t.call(`/admin/reports/${r1.id}/action`, {
      method: 'POST',
      token: admin,
      json: { action: 'warn' },
    });
    expect(
      await t.prisma.db.outboxEvent.count({
        where: { type: 'moderation.warned', payload: { path: ['userId'], equals: sender.id } },
      }),
    ).toBe(1);
    const m2 = await send('tin 2');
    const r2 = reportSchema.parse(await (await report(bTk, m2.id)).json());
    await t.call(`/admin/reports/${r2.id}/action`, {
      method: 'POST',
      token: admin,
      json: { action: 'lock' },
    });
    const u = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: sender.id },
      select: { status: true },
    });
    expect(u.status).toBe('locked');
  });

  it('từ khoá CRUD: seed 7, thêm → 201 cả danh sách, trùng (không phân biệt hoa thường) → 409, xoá → 404 lần 2', async () => {
    const admin = await adminTk();
    const list = keywordListSchema.parse(
      await (await t.call('/admin/moderation/keywords', { token: admin })).json(),
    );
    expect(list.items.slice(0, 7)).toEqual([
      'chuyển khoản trước',
      'bán tài khoản',
      'số CCCD',
      'mật khẩu',
      'đồ ngu',
      'kiếm tiền nhanh',
      'vay nóng',
    ]);
    const word = `thử-${randomUUID().slice(0, 6)}`;
    const add = await t.call('/admin/moderation/keywords', {
      method: 'POST',
      token: admin,
      json: { word },
    });
    expect(add.status).toBe(201);
    expect(keywordListSchema.parse(await add.json()).items.at(-1)).toBe(word);
    const dup = await t.call('/admin/moderation/keywords', {
      method: 'POST',
      token: admin,
      json: { word: word.toUpperCase() },
    });
    expect(dup.status).toBe(409);
    const path = `/admin/moderation/keywords/${encodeURIComponent(word)}`;
    expect((await t.call(path, { method: 'DELETE', token: admin })).status).toBe(200);
    expect((await t.call(path, { method: 'DELETE', token: admin })).status).toBe(404);
  });
});
