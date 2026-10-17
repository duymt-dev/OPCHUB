import {
  adminServiceCommentSchema,
  adminServiceSchema,
  csvFileSchema,
  serviceRequestSchema,
  serviceRequestSummarySchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NotificationEventsHandler } from '@/modules/notification';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/** B46: dịch vụ + phiếu YC qua cờ FEATURE_SERVICES (bật ở .env dev/test) */
describe('Dịch vụ + phiếu yêu cầu (B46)', () => {
  let t: TestApp;
  let admin: string;
  let adminId: string;
  const svcId = `sv-test-${randomUUID().slice(0, 6)}`;
  const codes: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
    await t.prisma.db.service.create({
      data: { id: svcId, name: 'Tư vấn thuế thử', model: 'Theo giờ', sort: 999 },
    });
  });
  beforeEach(async () => {
    await flushAuthState(t);
    const a = await createUser(t, { systemRole: 'admin' });
    adminId = a.id;
    admin = await tokenOf(t, a);
  });
  afterAll(async () => {
    await t.prisma.db.serviceRequest.deleteMany({ where: { code: { in: codes } } });
    await t.prisma.db.service.deleteMany({
      where: { id: { startsWith: 'sv' }, name: { contains: 'thử' } },
    });
    await t.close();
  });

  const body = {
    serviceId: svcId,
    requesterType: 'business',
    fullName: 'Nguyễn Thử',
    phone: '0901234567',
    email: 'thu@vd.vn',
    details: { 'Quy mô': '1-5 người' },
  };
  const submit = async (token: string, key: string | null, json: Record<string, unknown> = body) =>
    t.call('/service-requests', {
      method: 'POST',
      token,
      json,
      ...(key ? { headers: { 'Idempotency-Key': key } } : {}),
    });

  it('Portal: thành viên chưa đóng phí vẫn gửi được; mã YC-<n>; cùng key → cùng phiếu; thiếu key 400', async () => {
    const m = await tokenOf(t, await createUser(t, { fee: 'pending_payment' }));
    const list = (await (await t.call('/services', { token: m })).json()) as {
      items: { id: string }[];
    };
    expect(list.items.some((s) => s.id === svcId)).toBe(true);
    expect((await submit(m, null)).status).toBe(400);
    const key = randomUUID();
    const r1 = await submit(m, key);
    expect(r1.status).toBe(201);
    const a = serviceRequestSchema.parse(await r1.json());
    codes.push(a.code);
    expect(a).toMatchObject({
      status: 'new',
      serviceName: 'Tư vấn thuế thử',
      details: { 'Quy mô': '1-5 người' },
    });
    expect(a.code).toMatch(/^YC-\d+$/);
    const b = serviceRequestSchema.parse(await (await submit(m, key)).json());
    expect(b.code).toBe(a.code);
    expect((await submit(m, randomUUID(), { ...body, serviceId: 'khong-co' })).status).toBe(404);
  });

  it('Admin: transition có điều kiện (from sai 409, sai luồng 409), phụ trách, tóm tắt, CSV + audit', async () => {
    const m = await tokenOf(t, await createUser(t));
    const r = serviceRequestSchema.parse(await (await submit(m, randomUUID())).json());
    codes.push(r.code);
    const tr = (from: string, to: string) =>
      t.call(`/admin/service-requests/${r.code}/transition`, {
        method: 'POST',
        token: admin,
        json: { from, to },
      });
    expect((await tr('new', 'won')).status).toBe(409);
    expect(serviceRequestSchema.parse(await (await tr('new', 'consulting')).json()).status).toBe(
      'consulting',
    );
    const stale = await tr('new', 'consulting');
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as { error: { message: string } }).error.message).toBe(
      'Phiếu đã được cập nhật bởi người khác',
    );
    const as = await t.call(`/admin/service-requests/${r.code}/assignee`, {
      method: 'PATCH',
      token: admin,
      json: { assignee: 'Lê Minh Châu' },
    });
    expect(serviceRequestSchema.parse(await as.json()).assignee).toBe('Lê Minh Châu');
    const sum = serviceRequestSummarySchema.parse(
      await (await t.call('/admin/service-requests/summary', { token: admin })).json(),
    );
    expect(sum.byStatus.consulting).toBeGreaterThanOrEqual(1);
    const page = (await (
      await t.call(`/admin/service-requests?q=${r.code}`, { token: admin })
    ).json()) as {
      items: { code: string }[];
    };
    expect(page.items.map((i) => i.code)).toEqual([r.code]);
    const csv = csvFileSchema.parse(
      await (
        await t.call('/admin/service-requests/export', { method: 'POST', token: admin })
      ).json(),
    );
    expect(csv.csv).toContain(r.code);
    expect(
      await t.prisma.db.auditLog.count({
        where: { action: 'service_request.export', actorId: adminId },
      }),
    ).toBe(1);
  });

  it('bình luận: tác giả = người gọi, sanitize, @nhắc → outbox + thông báo cho nhân sự', async () => {
    const m = await tokenOf(t, await createUser(t));
    const r = serviceRequestSchema.parse(await (await submit(m, randomUUID())).json());
    codes.push(r.code);
    const staffUser = await createUser(t, { systemRole: 'admin' });
    const staffName = `Nhân sự ${randomUUID().slice(0, 8)}`;
    await t.prisma.db.user.update({ where: { id: staffUser.id }, data: { fullName: staffName } });
    const c = await t.call(`/admin/service-requests/${r.code}/comments`, {
      method: 'POST',
      token: admin,
      json: { body: '<p>Gọi lại khách</p><script>x()</script>', mentions: [staffName] },
    });
    expect(c.status).toBe(201);
    const cm = adminServiceCommentSchema.parse(await c.json());
    expect(cm.body).not.toContain('<script>');
    const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'service_request.mentioned', payload: { path: ['code'], equals: r.code } },
      select: { payload: true },
    });
    const payload = ev.payload as {
      userIds: string[];
      code: string;
      commentId: string;
      by: string;
    };
    expect(payload.userIds).toEqual([staffUser.id]);
    await t.app.get(NotificationEventsHandler).serviceMentioned(payload);
    const n = await t.prisma.db.notification.findFirst({
      where: { userId: staffUser.id },
      select: { title: true },
    });
    expect(n?.title).toContain(r.code);
  });

  it('danh mục: thêm, sửa một phần, xoá khi có phiếu → 409; thành viên 403', async () => {
    const created = adminServiceSchema.parse(
      await (
        await t.call('/admin/services', {
          method: 'POST',
          token: admin,
          json: { name: 'DV thử mới' },
        })
      ).json(),
    );
    const p = await t.call(`/admin/services/${created.id}`, {
      method: 'PATCH',
      token: admin,
      json: { enabled: false },
    });
    expect(adminServiceSchema.parse(await p.json())).toMatchObject({
      enabled: false,
      name: 'DV thử mới',
    });
    expect(
      (await t.call(`/admin/services/${created.id}`, { method: 'DELETE', token: admin })).status,
    ).toBe(200);
    const used = await t.call(`/admin/services/${svcId}`, { method: 'DELETE', token: admin });
    expect(used.status).toBe(409);
    const m = await tokenOf(t, await createUser(t));
    expect((await t.call('/admin/service-requests', { token: m })).status).toBe(403);
  });
});
