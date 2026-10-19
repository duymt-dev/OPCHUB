import { DEFAULT_ROLE_PERMISSIONS } from '@opchub/shared';
import {
  adminBadgesSchema,
  adminOverviewSchema,
  campaignSchema,
  exportJobSchema,
  personaSchema,
  scriptRunSchema,
  scriptSchema,
  serviceRequestSchema,
  smtpSettingsSchema,
} from '@opchub/shared/api-domains';
import { FakeStorageProvider } from '@opchub/integrations';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthStateService } from '@/common/auth';
import { STORAGE } from '@/common/integrations';
import { ExportService } from '@/modules/export';
import { CampaignSenderService, MarketingCoreModule } from '@/modules/marketing';
import { addMember, createGroup, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * Cổng pha B5: Super Admin chỉnh quyền + SMTP → Admin gửi chiến dịch (worker xếp thư) → xuất
 * thành viên nhóm (job + storage) → Tổng quan/badge → điều phối viên duyệt hội thoại bot (Portal
 * không thấy isSimulated) → thành viên gửi phiếu dịch vụ, Admin chuyển trạng thái. Mọi bước ghi audit.
 */
describe('Cổng B5: vận hành Admin', () => {
  let t: TestApp;
  const storage = new FakeStorageProvider();
  const svcId = `sv-gate-${randomUUID().slice(0, 6)}`;
  const cleanup: { campaign?: string; script?: string; persona?: string; request?: string } = {};
  let smtpKey: Uint8Array | null = null;
  beforeAll(async () => {
    t = await createTestApp({ imports: [MarketingCoreModule], overrides: [[STORAGE, storage]] });
    await flushAuthState(t);
    await t.prisma.db.service.create({ data: { id: svcId, name: 'Cổng B5 thử', sort: 998 } });
    const cfg = await t.prisma.db.smtpConfig.findUniqueOrThrow({
      where: { id: 1 },
      select: { keyEnc: true },
    });
    smtpKey = cfg.keyEnc;
  });
  afterAll(async () => {
    if (cleanup.request)
      await t.prisma.db.serviceRequest.deleteMany({ where: { code: cleanup.request } });
    await t.prisma.db.service.deleteMany({ where: { id: svcId } });
    if (cleanup.script) await t.prisma.db.botScript.deleteMany({ where: { id: cleanup.script } });
    if (cleanup.persona) {
      await t.prisma.db.message.deleteMany({ where: { personaId: cleanup.persona } });
      await t.prisma.db.persona.deleteMany({ where: { id: cleanup.persona } });
    }
    if (cleanup.campaign) {
      await t.prisma.db.mailLog.deleteMany({ where: { campaignId: cleanup.campaign } });
      await t.prisma.db.campaign.deleteMany({ where: { id: cleanup.campaign } });
    }
    await t.prisma.db.smtpConfig.update({
      where: { id: 1 },
      data: {
        keyEnc: smtpKey ? Uint8Array.from(smtpKey) : null,
        username: '',
        port: 587,
        host: 'smtp-relay.brevo.com',
      },
    });
    await t.prisma.db.rolePermission.deleteMany({});
    await t.app.get(AuthStateService).setGrants(DEFAULT_ROLE_PERMISSIONS);
    await t.close();
  });

  it('đầu-cuối', async () => {
    const owner = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
    const admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const modUser = await createUser(t, { adminPermissions: ['overview.view'] });
    const { roleId } = await t.prisma.db.adminUser.findUniqueOrThrow({
      where: { id: modUser.id },
      select: { roleId: true },
    });

    // 1. Phân quyền (RB-R05): cấp services.action cho vai trò → badge "requests" theo quyền mới
    const put = await t.call('/admin/admin-roles/permissions', {
      method: 'PUT',
      token: owner,
      json: {
        [roleId ?? '']: ['overview.view', 'groups.moderate', 'services.view', 'services.action'],
      },
    });
    expect(put.status).toBe(200);
    const mod = await tokenOf(t, modUser);

    // 2. SMTP: key không bao giờ ra ngoài
    const smtp = await t.call('/admin/smtp', {
      method: 'PUT',
      token: admin,
      json: {
        host: 'smtp-relay.brevo.com',
        port: 587,
        encryption: 'tls',
        username: 'gate@brevo',
        fromName: 'OPC Hub',
        fromEmail: 'no-reply@opchub.community',
        replyTo: 'support@opchub.community',
        dailyLimit: 300,
        enabled: true,
        key: 'gate-secret-key',
      },
    });
    const sm = smtpSettingsSchema.parse(await smtp.json());
    expect(sm.hasKey).toBe(true);

    // 3. Chiến dịch theo nhóm → worker xếp thư → sent
    const g = await createGroup(t);
    const members = await Promise.all([1, 2].map(() => createUser(t, { fee: 'active' })));
    for (const m of members) await addMember(t, g.id, m.id);
    const camp = campaignSchema.parse(
      await (
        await t.call('/admin/campaigns', {
          method: 'POST',
          token: admin,
          json: {
            name: 'Cổng B5',
            subject: 'Tin',
            body: '<p>x</p>',
            audience: 'groups',
            groupIds: [g.id],
            mode: 'send',
          },
        })
      ).json(),
    );
    cleanup.campaign = camp.id;
    expect(camp.status).toBe('sending');
    await t.app.get(CampaignSenderService).runBatch(camp.id);
    expect(await t.prisma.db.mailLog.count({ where: { campaignId: camp.id } })).toBe(2);

    // 4. Xuất thành viên nhóm → job done trên storage
    const ex = exportJobSchema.passthrough().parse(
      await (
        await t.call('/admin/groups/members/export', {
          method: 'POST',
          token: admin,
          json: { groupIds: [g.id], fields: ['name', 'email'], status: 'all', format: 'csv' },
        })
      ).json(),
    );
    await t.app.get(ExportService).run(ex.jobId);
    expect(storage.objects.has(`exports/${ex.jobId}.csv`)).toBe(true);

    // 5. Bot: điều phối viên duyệt → tin persona trong phòng general, Portal không thấy isSimulated
    const p = personaSchema.parse(
      await (
        await t.call('/admin/personas', {
          method: 'POST',
          token: mod,
          json: { name: 'Gate Bot', title: 'x', province: 'y', tone: 'z' },
        })
      ).json(),
    );
    cleanup.persona = p.id;
    const sc = scriptSchema.parse(
      await (
        await t.call('/admin/scripts', {
          method: 'POST',
          token: mod,
          json: {
            topic: 'Cổng',
            groupIds: [g.id],
            lines: [{ personaId: p.id, body: 'Chào cả nhà' }],
          },
        })
      ).json(),
    );
    cleanup.script = sc.id;
    const run = scriptRunSchema.parse(
      await (await t.call(`/admin/scripts/${sc.id}/run`, { method: 'POST', token: mod })).json(),
    );
    expect(
      (await t.call(`/admin/bot/threads/${run.threadId}/approve`, { method: 'POST', token: mod }))
        .status,
    ).toBe(200);
    const room = await t.prisma.db.room.findFirstOrThrow({
      where: { groupId: g.id, isDefault: true },
    });
    const memberTk = await tokenOf(t, members[0] ?? (await createUser(t)));
    const raw = await (await t.call(`/rooms/${room.id}/messages`, { token: memberTk })).text();
    expect(raw).toContain('Chào cả nhà');
    expect(raw).not.toContain('isSimulated');

    // 6. Phiếu dịch vụ → điều phối viên (đã có n.edit) chuyển trạng thái
    const req = serviceRequestSchema.parse(
      await (
        await t.call('/service-requests', {
          method: 'POST',
          token: memberTk,
          headers: { 'Idempotency-Key': randomUUID() },
          json: {
            serviceId: svcId,
            requesterType: 'personal',
            fullName: 'Thành viên',
            phone: '0901000000',
            email: 'a@b.vn',
            address: 'Hà Nội',
            note: 'Cần tư vấn',
            details: { 'Nghề nghiệp / vai trò': 'Freelancer' },
          },
        })
      ).json(),
    );
    cleanup.request = req.code;
    const badges = adminBadgesSchema.parse(
      await (await t.call('/admin/badges', { token: mod })).json(),
    );
    expect(badges.requests).toBeGreaterThanOrEqual(1);
    const tr = await t.call(`/admin/service-requests/${req.code}/transition`, {
      method: 'POST',
      token: mod,
      json: { from: 'new', to: 'consulting' },
    });
    expect(serviceRequestSchema.parse(await tr.json()).status).toBe('consulting');

    // 7. Tổng quan + nhật ký
    await t.redis.client.del('admin:overview');
    adminOverviewSchema.parse(await (await t.call('/admin/overview', { token: admin })).json());
    const logs = (await (await t.call('/admin/audit-logs', { token: owner })).json()) as {
      items: { summary: string }[];
    };
    const s = logs.items.map((l) => l.summary);
    expect(s).toContain('cập nhật phân quyền vai trò');
    expect(s).toContain('gửi chiến dịch Cổng B5');
    expect(s.some((x) => x.startsWith('duyệt hội thoại'))).toBe(true);
    expect(s.some((x) => x.startsWith(`chuyển phiếu ${req.code}`))).toBe(true);
  });
});
