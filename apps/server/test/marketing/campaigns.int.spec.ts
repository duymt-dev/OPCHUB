import { campaignSchema, mailJobSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

  it('nhật ký thư: chỉ welcome/campaign đã gửi, có tên; gửi lại 202; summary + templates', async () => {
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
    await t.prisma.db.mailLog.create({
      data: { to: u.email, kind: 'otp', subject: 'OTP', status: 'sent' },
    });
    const page = (await (
      await t.call('/admin/mail/log?page=1&size=100', { token: editor })
    ).json()) as {
      items: { id: string; kind: string; name: string }[];
      total: number;
    };
    expect(page.items.every((i) => i.kind === 'welcome' || i.kind === 'campaign')).toBe(true);
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

  it('thành viên thường không vào được Marketing (403)', async () => {
    const m = await tokenOf(t, await createUser(t));
    expect((await t.call('/admin/campaigns', { token: m })).status).toBe(403);
  });
});
