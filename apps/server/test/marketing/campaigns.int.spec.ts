import { campaignSchema, mailJobSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ENV, type Env } from '@/common/config';
import {
  CAMPAIGN_BATCH,
  CampaignSenderService,
  CampaignService,
  MarketingCoreModule,
} from '@/modules/marketing';
import { addMember, createGroup, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const PREFIX = 'CD thử';

describe('Marketing — chiến dịch (B42)', () => {
  let t: TestApp;
  let editor: string;
  beforeAll(async () => {
    t = await createTestApp({ imports: [MarketingCoreModule] });
  });
  beforeEach(async () => {
    await flushAuthState(t);
    editor = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    const ids = (
      await t.prisma.db.campaign.findMany({
        where: { name: { startsWith: PREFIX } },
        select: { id: true },
      })
    ).map((c) => c.id);
    await t.prisma.db.mailLog.deleteMany({ where: { campaignId: { in: ids } } });
    await t.prisma.db.campaign.deleteMany({ where: { id: { in: ids } } });
    await t.close();
  });

  const create = (json: Record<string, unknown>) =>
    t.call('/admin/campaigns', {
      method: 'POST',
      token: editor,
      json: { subject: 'Tin tháng 10', body: '<p>Xin chào</p>', audience: 'all', ...json },
    });

  it('nháp 201 (sanitize body, recipients null) → gửi 202 → gửi lại 409 → xoá khi đang gửi 409', async () => {
    const r = await create({
      name: `${PREFIX} nháp`,
      mode: 'draft',
      body: '<p>a</p><script>x()</script>',
    });
    expect(r.status).toBe(201);
    const c = campaignSchema.parse(await r.json());
    expect(c).toMatchObject({
      status: 'draft',
      recipients: null,
      audienceLabel: 'Tất cả thành viên',
    });
    expect(c.body).not.toContain('<script>');

    const s = await t.call(`/admin/campaigns/${c.id}/send`, { method: 'POST', token: editor });
    expect(s.status).toBe(202);
    expect(mailJobSchema.parse(await s.json()).recipients).toBeGreaterThan(0);
    const again = await t.call(`/admin/campaigns/${c.id}/send`, { method: 'POST', token: editor });
    expect(again.status).toBe(409);
    const del = await t.call(`/admin/campaigns/${c.id}`, { method: 'DELETE', token: editor });
    expect(del.status).toBe(409);
    const ev = await t.prisma.db.outboxEvent.count({
      where: { type: 'campaign.send', payload: { equals: { campaignId: c.id } } },
    });
    expect(ev).toBe(1);
  });

  it('theo nhóm: nhãn tên nhóm, ước tính = member_count; worker gửi đủ người, không trùng, → sent', async () => {
    const g = await createGroup(t);
    const members = await Promise.all([1, 2, 3].map(() => createUser(t)));
    for (const m of members) await addMember(t, g.id, m.id);
    await t.prisma.db.group.update({ where: { id: g.id }, data: { memberCount: 3 } });
    const est = await t.call(`/admin/campaigns/estimate?audience=groups&groupIds=${g.id}`, {
      token: editor,
    });
    expect(await est.json()).toEqual({ recipients: 3 });

    const r = await create({
      name: `${PREFIX} nhóm`,
      mode: 'send',
      audience: 'groups',
      groupIds: [g.id],
    });
    expect(r.status).toBe(202);
    const c = campaignSchema.parse(await r.json());
    expect(c.audienceLabel).toBe(`Nhóm: ${g.name}`);
    const sender = t.app.get(CampaignSenderService);
    const first = await sender.runBatch(c.id);
    expect(first).toEqual({ queued: 3, more: false });
    // Job lặp lại sau khi xong → không xếp thêm
    expect(await sender.runBatch(c.id)).toEqual({ queued: 0, more: false });
    const row = await t.prisma.db.campaign.findUniqueOrThrow({ where: { id: c.id } });
    expect(row).toMatchObject({ status: 'sent', recipients: 3 });
    const logs = await t.prisma.db.mailLog.findMany({
      where: { campaignId: c.id },
      select: { to: true },
    });
    expect(new Set(logs.map((l) => l.to.toLowerCase()))).toEqual(
      new Set(members.map((m) => m.email.toLowerCase())),
    );
    expect(CAMPAIGN_BATCH).toBeGreaterThan(3);
  });

  it('lên lịch: thiếu giờ → 400; đến hạn → scheduler chuyển sending + outbox; xoá nháp được', async () => {
    expect((await create({ name: `${PREFIX} lịch`, mode: 'schedule' })).status).toBe(400);
    const at = new Date(Date.now() + 60_000).toISOString();
    const r = await create({ name: `${PREFIX} lịch`, mode: 'schedule', scheduledAt: at });
    const c = campaignSchema.parse(await r.json());
    expect(c).toMatchObject({ status: 'scheduled', sendAt: at });
    const svc = t.app.get(CampaignService);
    expect(await svc.sendDue(new Date(Date.now() + 120_000))).toBeGreaterThanOrEqual(1);
    const row = await t.prisma.db.campaign.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.status).toBe('sending');

    const d = campaignSchema.parse(
      await (await create({ name: `${PREFIX} xoá`, mode: 'draft' })).json(),
    );
    expect(
      (await t.call(`/admin/campaigns/${d.id}`, { method: 'DELETE', token: editor })).status,
    ).toBe(200);
    expect(
      (await t.call(`/admin/campaigns/${d.id}`, { method: 'DELETE', token: editor })).status,
    ).toBe(404);
    const log = await t.prisma.db.auditLog.findFirst({
      where: { action: 'campaign.delete', entityId: d.id },
      select: { tag: true, summary: true },
    });
    expect(log).toEqual({ tag: 'content', summary: `xoá chiến dịch ${PREFIX} xoá` });
  });

  it('REQ-205 NA-05 nhật ký thư mọi loại + trạng thái, có tên; gửi lại 202; summary + templates', async () => {
    const u = await createUser(t);
    const sent = await t.prisma.db.mailLog.create({
      data: {
        to: u.email,
        kind: 'welcome',
        subject: 'Chào mừng',
        status: 'sent',
        sentAt: new Date(),
      },
    });
    const otp = await t.prisma.db.mailLog.create({
      data: { to: u.email, kind: 'otp', subject: 'OTP', status: 'failed', attempts: 4, error: 'x' },
    });
    const page = (await (
      await t.call('/admin/mail/log?page=1&size=100', { token: editor })
    ).json()) as {
      items: { id: string; kind: string; name: string; status: string; attempts: number }[];
      total: number;
    };
    expect(page.items.find((i) => i.id === otp.id)).toMatchObject({
      kind: 'otp',
      status: 'failed',
      attempts: 4,
    });
    // OTP lỗi không gửi lại được (mã đã hết hạn)
    expect(
      (await t.call(`/admin/mail/log/${otp.id}/resend`, { method: 'POST', token: editor })).status,
    ).toBe(404);
    const { fullName } = await t.prisma.db.user.findUniqueOrThrow({
      where: { id: u.id },
      select: { fullName: true },
    });
    expect(page.items.find((i) => i.id === sent.id)?.name).toBe(fullName);
    const re = await t.call(`/admin/mail/log/${sent.id}/resend`, { method: 'POST', token: editor });
    expect(re.status).toBe(202);
    const job = mailJobSchema.parse(await re.json());
    expect((await t.prisma.db.mailLog.findUniqueOrThrow({ where: { id: job.jobId } })).kind).toBe(
      'welcome',
    );

    const sum = (await (await t.call('/admin/marketing/summary', { token: editor })).json()) as {
      welcomeSent: number;
    };
    expect(sum.welcomeSent).toBeGreaterThanOrEqual(1);
    const tpl = (await (await t.call('/admin/campaigns/templates', { token: editor })).json()) as {
      items: unknown[];
    };
    expect(tpl.items.length).toBeGreaterThan(0);
    await t.prisma.db.mailLog.deleteMany({ where: { to: u.email } });
  });

  it('REQ-227 giữ {{ten}} khi lưu, thay + escape khi gửi', async () => {
    const g = await createGroup(t);
    const u = await createUser(t);
    await t.prisma.db.user.update({ where: { id: u.id }, data: { fullName: 'Nguyễn <An>' } });
    await addMember(t, g.id, u.id);
    const r = await create({
      name: `${PREFIX} biến`,
      mode: 'send',
      audience: 'groups',
      groupIds: [g.id],
      body: '<p>Chào {{ten}} – {{email}} – {{nhom}} {{la}}</p><a href="{{link_dang_nhap}}">Vào</a>',
    });
    expect(r.status).toBe(202);
    const c = campaignSchema.parse(await r.json());
    const row = await t.prisma.db.campaign.findUniqueOrThrow({ where: { id: c.id } });
    // NA-27: biến giữ nguyên byte khi lưu
    expect(row.bodyHtml).toBe(
      '<p>Chào {{ten}} – {{email}} – {{nhom}} {{la}}</p>' +
        '<a href="{{link_dang_nhap}}" rel="noopener noreferrer">Vào</a>',
    );
    expect(await t.app.get(CampaignSenderService).runBatch(c.id)).toEqual({
      queued: 1,
      more: false,
    });
    const mail = await t.prisma.db.mailLog.findFirstOrThrow({
      where: { campaignId: c.id },
      select: { bodyHtml: true },
    });
    const portal = t.app.get<Env>(ENV).PORTAL_URL;
    const html = mail.bodyHtml ?? '';
    expect(html).toContain(`Chào Nguyễn &lt;An&gt; – ${u.email} – ${g.name} {{la}}`);
    expect(html).toContain(`href="${portal}/login"`);
    expect(html).not.toContain('{{ten}}');
    expect(html).not.toContain('<An>');
    await t.prisma.db.group.delete({ where: { id: g.id } });
  });

  it('thành viên thường không vào được Marketing (403)', async () => {
    const m = await tokenOf(t, await createUser(t));
    expect((await t.call('/admin/campaigns', { token: m })).status).toBe(403);
  });

  it('BUG-036 dừng chiến dịch đang gửi: thư chờ bị huỷ, không xếp lô sau', async () => {
    // 1.200 người nhận (lô 500) — chèn thẳng bằng generate_series để test nhanh
    const g = await createGroup(t);
    const tag = g.id.slice(0, 8);
    await t.prisma.db.$executeRaw`
      INSERT INTO users (id, member_code, account_type, full_name, email, phone, password_hash,
                         system_role, status, updated_at)
      SELECT ${tag} || '-' || lpad(n::text, 4, '0'), 'C' || ${tag} || n, 'personal', 'Người nhận ' || n,
             'cc-' || ${tag} || '-' || n || '@test.opchub.vn', NULL, 'x', 'member', 'active', now()
      FROM generate_series(1, 1200) AS n`;
    await t.prisma.db.$executeRaw`
      INSERT INTO group_members (group_id, user_id, group_role, status, updated_at)
      SELECT ${g.id}, ${tag} || '-' || lpad(n::text, 4, '0'), 'member', 'member', now()
      FROM generate_series(1, 1200) AS n`;
    const r = await create({
      name: `${PREFIX} dừng`,
      mode: 'send',
      audience: 'groups',
      groupIds: [g.id],
    });
    const c = campaignSchema.parse(await r.json());
    const sender = t.app.get(CampaignSenderService);
    expect(await sender.runBatch(c.id)).toEqual({ queued: CAMPAIGN_BATCH, more: true });
    // 10 thư đầu đã gửi xong
    const first = await t.prisma.db.mailLog.findMany({
      where: { campaignId: c.id },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 10,
    });
    await t.prisma.db.mailLog.updateMany({
      where: { id: { in: first.map((m) => m.id) } },
      data: { status: 'sent', sentAt: new Date(), bodyHtml: null },
    });

    const stop = await t.call(`/admin/campaigns/${c.id}/cancel`, { method: 'POST', token: editor });
    expect(stop.status).toBe(200);
    expect(campaignSchema.parse(await stop.json())).toMatchObject({
      status: 'cancelled',
      recipients: 10,
    });
    const row = await t.prisma.db.campaign.findUniqueOrThrow({ where: { id: c.id } });
    expect(row).toMatchObject({ status: 'cancelled', sendCursor: null });
    expect(row.cancelledAt).not.toBeNull();
    const byStatus = await t.prisma.db.mailLog.groupBy({
      by: ['status'],
      where: { campaignId: c.id },
      _count: { _all: true },
    });
    const count = Object.fromEntries(byStatus.map((b) => [b.status, b._count._all]));
    expect(count).toEqual({ sent: 10, cancelled: CAMPAIGN_BATCH - 10 });
    expect(
      await t.prisma.db.mailLog.count({ where: { campaignId: c.id, bodyHtml: { not: null } } }),
    ).toBe(0);
    // Job lô 2 chạy sau khi dừng → không xếp thêm
    expect(await sender.runBatch(c.id)).toEqual({ queued: 0, more: false });
    expect(await t.prisma.db.mailLog.count({ where: { campaignId: c.id } })).toBe(CAMPAIGN_BATCH);
    const audit = await t.prisma.db.auditLog.findFirst({
      where: { action: 'campaign.cancel', entityId: c.id },
      select: { tag: true, summary: true },
    });
    expect(audit?.tag).toBe('content');
    expect(audit?.summary).toContain(`${PREFIX} dừng`);

    // Test âm: gọi lại → 409
    const again = await t.call(`/admin/campaigns/${c.id}/cancel`, {
      method: 'POST',
      token: editor,
    });
    expect(again.status).toBe(409);
    await t.prisma.db.$executeRaw`DELETE FROM users WHERE id LIKE ${tag + '-%'}`;
    await t.prisma.db.group.delete({ where: { id: g.id } });
  });

  it('BUG-036 dừng chiến dịch đã gửi → 409; nháp → 409; không tồn tại → 404; thành viên 403', async () => {
    const d = campaignSchema.parse(
      await (await create({ name: `${PREFIX} nháp dừng`, mode: 'draft' })).json(),
    );
    const call = (id: string, token = editor) =>
      t.call(`/admin/campaigns/${id}/cancel`, { method: 'POST', token });
    expect((await call(d.id)).status).toBe(409);
    await t.prisma.db.campaign.update({ where: { id: d.id }, data: { status: 'sent' } });
    const sent = await call(d.id);
    expect(sent.status).toBe(409);
    expect(((await sent.json()) as { error: { message: string } }).error.message).toBe(
      'Chiến dịch đã gửi xong hoặc đã dừng',
    );
    expect((await call('khong-co')).status).toBe(404);
    const m = await tokenOf(t, await createUser(t));
    expect((await call(d.id, m)).status).toBe(403);
  });

  it('BUG-036 dừng chiến dịch đã lên lịch → scheduler không gửi nữa', async () => {
    const at = new Date(Date.now() + 60_000).toISOString();
    const c = campaignSchema.parse(
      await (
        await create({ name: `${PREFIX} lịch dừng`, mode: 'schedule', scheduledAt: at })
      ).json(),
    );
    expect(
      (await t.call(`/admin/campaigns/${c.id}/cancel`, { method: 'POST', token: editor })).status,
    ).toBe(200);
    await t.app.get(CampaignService).sendDue(new Date(Date.now() + 120_000));
    const row = await t.prisma.db.campaign.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.status).toBe('cancelled');
  });
});
