import { apiErrorSchema, loginResponseSchema } from '@opchub/shared/api';
import {
  adminEventSchema,
  adminProjectSchema,
  chatMessageSchema,
  projectCommentViewSchema,
  serviceRequestSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HtmlBackfillService } from '@/common/html/html-backfill.service';
import { removeTestEvents, TEST_EVENT_PREFIX } from '../factories/event.factory';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { connected, createSocketApp, type SocketTestApp } from '../setup/socket-app';
import { createTestApp, type TestApp } from '../setup/test-app';

const XSS = '<script>alert(1)</script><img src=x onerror=alert(2)>';
const DIRTY = /<script|onerror=|javascript:/i;

/** NA-27 / BUG-020 / TD-017: làm sạch ở biên server (TIP-V2-103) */
describe('Làm sạch rich text + chuỗi người dùng (TIP-V2-103)', () => {
  let t: TestApp;
  let s: SocketTestApp;
  let admin: string;
  const svcId = `sv-test-${randomUUID().slice(0, 6)}`;
  const codes: string[] = [];

  beforeAll(async () => {
    t = await createTestApp({ providers: [HtmlBackfillService] });
    s = await createSocketApp();
    await t.prisma.db.service.create({
      data: { id: svcId, name: 'Dịch vụ thử sanitize', model: 'Theo giờ', sort: 999 },
    });
  });
  beforeEach(async () => {
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    await t.prisma.db.serviceRequest.deleteMany({ where: { code: { in: codes } } });
    await t.prisma.db.service.deleteMany({ where: { id: svcId } });
    await t.prisma.db.campaign.deleteMany({ where: { name: 'CD thử backfill' } });
    await removeTestEvents(t);
    await removeTestProjects(t);
    await removeTestGroups(t);
    await s.close();
    await t.close();
  });

  const member = async () => {
    const u = await createUser(t, { fee: 'active' });
    return { u, tk: await tokenOf(t, u) };
  };
  const comment = (projectId: string, token: string, body: string) =>
    t.call(`/projects/${projectId}/comments`, {
      method: 'POST',
      token,
      json: { type: 'feedback', body },
    });

  it('BUG-020 REQ-227 bình luận dự án bỏ script', async () => {
    const owner = await member();
    const p = await createProject(t, owner.tk);
    const v = await member();
    const r = await comment(p.id, v.tk, `${XSS}Chào`);
    expect(r.status).toBe(201);
    const c = projectCommentViewSchema.parse(await r.json());
    expect(c.body).toBe('Chào');
    const row = await t.prisma.db.projectComment.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.body).toBe('Chào');
  });

  it('BUG-020 bình luận chỉ có script → 400', async () => {
    const owner = await member();
    const p = await createProject(t, owner.tk);
    const r = await comment(p.id, owner.tk, '<script>alert(1)</script>');
    expect(r.status).toBe(400);
    const e = apiErrorSchema.parse(await r.json());
    expect(e.error.code).toBe('VALIDATION_ERROR');
    expect(e.error.fields).toEqual([{ path: 'body', message: 'Nội dung không hợp lệ' }]);
    expect(await t.prisma.db.projectComment.count({ where: { projectId: p.id } })).toBe(0);
  });

  it('REQ-227 mô tả sự kiện giữ thẻ cho phép', async () => {
    const r = await t.call('/admin/events', {
      method: 'POST',
      token: admin,
      json: {
        title: `${TEST_EVENT_PREFIX} <b>sanitize</b>`,
        mode: 'online',
        startsAt: '2030-11-20T12:00:00.000Z',
        place: 'https://zoom.us/j/1',
        seats: 10,
        description: `<p onclick=x>Hội thảo <b>AI</b></p><a href="javascript:alert(1)">x</a>${XSS}`,
      },
    });
    expect(r.status).toBe(201);
    const ev = adminEventSchema.parse(await r.json());
    const row = await t.prisma.db.event.findUniqueOrThrow({ where: { id: ev.id } });
    expect(row.description).toBe('<p>Hội thảo <b>AI</b></p><a rel="noopener noreferrer">x</a>');
    // Trường không phải rich: bỏ thẻ
    expect(row.title).toBe(`${TEST_EVENT_PREFIX} sanitize`);
  });

  it('REQ-227 ghi chú phiếu YC + ghi chú duyệt dự án', async () => {
    const m = await tokenOf(t, await createUser(t));
    const r = await t.call('/service-requests', {
      method: 'POST',
      token: m,
      headers: { 'Idempotency-Key': randomUUID() },
      json: {
        serviceId: svcId,
        requesterType: 'personal',
        fullName: '<i>Nguyễn</i> Thử',
        phone: '0901234567',
        email: 'thu@vd.vn',
        address: 'Hà Nội',
        details: { 'Nghề nghiệp / vai trò': 'Freelancer' },
        note: `<p>Cần <b>gấp</b></p>${XSS}`,
      },
    });
    expect(r.status).toBe(201);
    const req = serviceRequestSchema.parse(await r.json());
    codes.push(req.code);
    const sr = await t.prisma.db.serviceRequest.findUniqueOrThrow({ where: { code: req.code } });
    expect(sr).toMatchObject({ note: '<p>Cần <b>gấp</b></p>', fullName: 'Nguyễn Thử' });

    const owner = await member();
    const p = await createProject(t, owner.tk, {}, false);
    const rv = await t.call(`/admin/projects/${p.id}/review`, {
      method: 'POST',
      token: admin,
      json: { decision: 'reject', note: `<p>Thiếu <b>demo</b></p>${XSS}` },
    });
    expect(rv.status).toBe(200);
    expect(adminProjectSchema.parse(await rv.json()).reviewNote).toBe('<p>Thiếu <b>demo</b></p>');
  });

  it('REQ-227 tin chat REST + socket là text thuần', async () => {
    const g = await createGroup(t);
    const a = await member();
    await addMember(t, g.id, a.u.id);
    const room = `${g.id}-general`;
    const send = (body: string) =>
      t.call(`/rooms/${room}/messages`, {
        method: 'POST',
        token: a.tk,
        json: { clientMsgId: randomUUID(), body },
      });
    const r1 = chatMessageSchema.parse(await (await send('2 < 3 và a<b')).json());
    expect(r1.body).toBe('2 < 3 và a<b');
    const r2 = chatMessageSchema.parse(await (await send('<b>đậm</b>')).json());
    expect(r2.body).toBe('đậm');
    expect((await send('<script>x</script>')).status).toBe(400);

    const sock = s.connect(a.tk);
    await connected(sock);
    const joined = (await sock.emitWithAck('room.join', { roomId: room })) as { ok: boolean };
    expect(joined.ok).toBe(true);
    const ack = (await sock.emitWithAck('message.send', {
      roomId: room,
      clientMsgId: randomUUID(),
      body: `<i>nghiêng</i>${XSS} R&D`,
    })) as { ok: true; data: unknown };
    const m = chatMessageSchema.parse(ack.data);
    expect(m.body).toBe('nghiêng R&D');
    const rows = await t.prisma.db.message.findMany({
      where: { id: { in: [r1.id, r2.id, m.id] } },
      select: { id: true, body: true },
    });
    expect(new Map(rows.map((x) => [x.id, x.body]))).toEqual(
      new Map([
        [r1.id, '2 < 3 và a<b'],
        [r2.id, 'đậm'],
        [m.id, 'nghiêng R&D'],
      ]),
    );
  });

  it('REQ-227 mật khẩu có ký tự < không bị đổi', async () => {
    const email = `san-${Date.now().toString(36)}@test.opchub.vn`;
    const password = 'Ab<b>12345';
    const reg = await t.call('/auth/register/personal', {
      method: 'POST',
      json: {
        fullName: '<b>Người</b> Đăng Ký',
        phone: { country: 'vn', number: '' },
        email,
        password,
        persona: 'expert',
        groupIds: ['c1'],
        agreeTerms: true,
      },
    });
    expect(reg.status).toBe(202);
    const ok = await t.call('/auth/otp/verify', {
      method: 'POST',
      json: { email, code: '123456' },
    });
    expect(ok.status).toBe(200);
    expect(loginResponseSchema.parse(await ok.json()).me.fullName).toBe('Người Đăng Ký');
    await flushAuthState(t);
    const login = await t.call('/auth/login', {
      method: 'POST',
      json: { identifier: email, password },
    });
    expect(login.status).toBe(200);
  });

  it('TD-017 backfill idempotent', async () => {
    const owner = await member();
    const v = await member();
    const g = await createGroup(t);
    await addMember(t, g.id, owner.u.id);
    const p = await createProject(t, owner.tk);
    const ev = await t.prisma.db.event.create({
      data: {
        title: `${TEST_EVENT_PREFIX} backfill html`,
        mode: 'online',
        startsAt: new Date('2030-01-01T00:00:00Z'),
        place: 'https://zoom.us/j/1',
        seats: 10,
        description: `<p>Sự kiện</p>${XSS}<a href="javascript:x">l</a>`,
      },
    });
    // Ghi thẳng DB (mô phỏng dữ liệu cũ trước NA-27) — đủ 9 cột
    await t.prisma.db.project.update({
      where: { id: p.id },
      data: { descriptionHtml: `<p>Mô tả</p>${XSS}`, reviewNote: `<b>ghi chú</b>${XSS}` },
    });
    const cm = await t.prisma.db.projectComment.create({
      data: { projectId: p.id, authorId: owner.u.id, body: `${XSS}Góp ý` },
    });
    const code = `YC-T${Date.now().toString(36)}`;
    codes.push(code);
    await t.prisma.db.serviceRequest.create({
      data: {
        code,
        serviceId: svcId,
        requesterType: 'personal',
        fullName: 'Thử',
        phone: '0901234567',
        email: 'thu@vd.vn',
        note: `<p>Note</p>${XSS}`,
        comments: { create: { authorName: 'NV', body: `<p>Cmt</p>${XSS}` } },
      },
    });
    const camp = await t.prisma.db.campaign.create({
      data: {
        name: 'CD thử backfill',
        subject: 's',
        audience: 'all',
        bodyHtml: `<p>Chào {{ten}}</p>${XSS}<a href="{{link_dang_nhap}}">Vào</a>`,
      },
    });
    const msg = await t.prisma.db.message.create({
      data: { roomId: `${g.id}-general`, senderId: owner.u.id, body: `<b>chat</b>${XSS}` },
    });
    const intr = await t.prisma.db.investorInterest.create({
      data: {
        projectId: p.id,
        userId: v.u.id,
        kind: 'individual',
        contactName: 'NĐT',
        phone: '0901234567',
        amount: 1000n,
        message: `<i>quan tâm</i>${XSS}`,
        investorKey: v.u.id,
      },
    });

    const svc = t.app.get(HtmlBackfillService);
    const first = await svc.run();
    for (const col of [
      'projects.description_html',
      'projects.review_note',
      'events.description',
      'service_requests.note',
      'service_request_comments.body',
      'campaigns.body_html',
      'project_comments.body',
      'messages.body',
      'investor_interests.message',
    ]) {
      expect(first[col], col).toBeGreaterThanOrEqual(1);
    }

    const pr = await t.prisma.db.project.findUniqueOrThrow({ where: { id: p.id } });
    expect(pr.descriptionHtml).toBe('<p>Mô tả</p>');
    expect(pr.reviewNote).toBe('<b>ghi chú</b>');
    const e2 = await t.prisma.db.event.findUniqueOrThrow({ where: { id: ev.id } });
    expect(e2.description).toBe('<p>Sự kiện</p><a rel="noopener noreferrer">l</a>');
    const c1 = await t.prisma.db.projectComment.findUniqueOrThrow({ where: { id: cm.id } });
    expect(c1.body).toBe('Góp ý');
    const sr = await t.prisma.db.serviceRequest.findUniqueOrThrow({
      where: { code },
      include: { comments: true },
    });
    expect(sr.note).toBe('<p>Note</p>');
    expect(sr.comments[0]?.body).toBe('<p>Cmt</p>');
    const c2 = await t.prisma.db.campaign.findUniqueOrThrow({ where: { id: camp.id } });
    expect(c2.bodyHtml).toBe(
      '<p>Chào {{ten}}</p><a href="{{link_dang_nhap}}" rel="noopener noreferrer">Vào</a>',
    );
    const m2 = await t.prisma.db.message.findUniqueOrThrow({ where: { id: msg.id } });
    expect(m2.body).toBe('chat');
    const i2 = await t.prisma.db.investorInterest.findUniqueOrThrow({ where: { id: intr.id } });
    expect(i2.message).toBe('quan tâm');
    const all = [pr.descriptionHtml, pr.reviewNote, e2.description, c1.body, sr.note];
    all.push(sr.comments[0]?.body ?? '', c2.bodyHtml, m2.body, i2.message);
    for (const x of all) expect(x ?? '').not.toMatch(DIRTY);

    // Lần 2: không còn ô nào cần đổi → 0 dòng
    expect(await svc.run()).toEqual({});
  });
});
