import { FakeMailProvider } from '@opchub/integrations';
import {
  mailJobSchema,
  smtpSettingsSchema,
  smtpTestResultSchema,
  welcomeMailSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MAIL } from '@/common/integrations';
import { RedisService } from '@/common/redis/redis.service';
import { AppSettingsService } from '@/modules/settings';
import { DailyQuota, vnDay } from '@/modules/mail/daily-quota';
import { EventMailHandler, MailSenderService } from '@/modules/mail';
import { createEvent, removeTestEvents } from '../factories/event.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const SECRET = 'xkeysib-test-secret-123';

describe('Admin mail chào mừng + SMTP (B41)', () => {
  let t: TestApp;
  let admin: string;
  const fake = new FakeMailProvider();
  let smtpBackup: Awaited<ReturnType<TestApp['prisma']['db']['smtpConfig']['findUniqueOrThrow']>>;
  let welcomeBackup: unknown;

  beforeAll(async () => {
    t = await createTestApp({ overrides: [[MAIL, fake]] });
    smtpBackup = await t.prisma.db.smtpConfig.findUniqueOrThrow({ where: { id: 1 } });
    welcomeBackup = (
      await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'welcome_mail' } })
    ).value;
  });
  beforeEach(async () => {
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    const b = smtpBackup;
    await t.prisma.db.smtpConfig.update({
      where: { id: 1 },
      data: {
        host: b.host,
        port: b.port,
        encryption: b.encryption,
        username: b.username,
        keyEnc: b.keyEnc,
        fromName: b.fromName,
        fromEmail: b.fromEmail,
        replyTo: b.replyTo,
        dailyLimit: b.dailyLimit,
        enabled: b.enabled,
      },
    });
    await t.prisma.db.appSetting.update({
      where: { key: 'welcome_mail' },
      data: { value: welcomeBackup as never },
    });
    await t.app.get(AppSettingsService).invalidate('welcome_mail');
    await t.close();
  });

  const smtpBody = {
    host: 'smtp-relay.brevo.com',
    port: 465,
    encryption: 'ssl' as const,
    username: 'opchub@brevo',
    fromName: 'OPC Hub',
    fromEmail: 'no-reply@opchub.community',
    replyTo: 'support@opchub.community',
    dailyLimit: 300,
    enabled: true,
  };

  it('SMTP: chưa key → test báo lỗi; PUT có key → hasKey, key_enc không chứa key rõ; GET không lộ key', async () => {
    await t.prisma.db.smtpConfig.update({ where: { id: 1 }, data: { keyEnc: null } });
    const none = smtpTestResultSchema.parse(
      await (
        await t.call('/admin/smtp/test', { method: 'POST', token: admin, json: { to: 'a@b.vn' } })
      ).json(),
    );
    expect(none).toEqual({ ok: false, message: 'Chưa cấu hình API key SMTP' });
    const verifyNo = smtpTestResultSchema.parse(
      await (
        await t.call('/admin/smtp/verify', { method: 'POST', token: admin, json: smtpBody })
      ).json(),
    );
    expect(verifyNo.ok).toBe(false);

    const put = await t.call('/admin/smtp', {
      method: 'PUT',
      token: admin,
      json: { ...smtpBody, key: SECRET },
    });
    const s = smtpSettingsSchema.parse(await put.json());
    expect(s).toMatchObject({ hasKey: true, port: 465, username: 'opchub@brevo' });
    const raw = await (await t.call('/admin/smtp', { token: admin })).text();
    expect(raw).not.toContain(SECRET);
    const row = await t.prisma.db.smtpConfig.findUniqueOrThrow({ where: { id: 1 } });
    expect(Buffer.from(row.keyEnc ?? []).toString('utf8')).not.toContain(SECRET);
    // PUT không kèm key → giữ key cũ
    await t.call('/admin/smtp', {
      method: 'PUT',
      token: admin,
      json: { ...smtpBody, dailyLimit: 250 },
    });
    expect(
      smtpSettingsSchema.parse(await (await t.call('/admin/smtp', { token: admin })).json()).hasKey,
    ).toBe(true);
  });

  it('verify (fake, key đã lưu) → "Xác thực thành công với …:465"; test → thư thử vào mail_logs + audit', async () => {
    const v = smtpTestResultSchema.parse(
      await (
        await t.call('/admin/smtp/verify', { method: 'POST', token: admin, json: smtpBody })
      ).json(),
    );
    expect(v).toEqual({ ok: true, message: 'Xác thực thành công với smtp-relay.brevo.com:465' });
    const to = `smtp-${Date.now().toString(36)}@test.opchub.vn`;
    const r = smtpTestResultSchema.parse(
      await (
        await t.call('/admin/smtp/test', { method: 'POST', token: admin, json: { to } })
      ).json(),
    );
    expect(r).toEqual({ ok: true, message: `Đã gửi thư thử tới ${to}` });
    const log = await t.prisma.db.mailLog.findFirst({ where: { to, kind: 'test' } });
    expect(log?.status).toBe('queued');
    expect(log?.bodyHtml).toContain('bgcolor="#0B1F4D"');
    expect(log?.bodyHtml).toContain('Cấu hình SMTP hoạt động.');
    const actions = await t.prisma.db.auditLog.findMany({
      where: { action: { in: ['smtp.update', 'smtp.verify', 'smtp.test'] } },
      select: { action: true },
      distinct: ['action'],
    });
    expect(actions.map((a) => a.action).sort()).toEqual([
      'smtp.test',
      'smtp.update',
      'smtp.verify',
    ]);
  });

  it('mail chào mừng: PUT → GET; gửi thử 202 mailJob; điều phối viên 403', async () => {
    const cur = welcomeMailSchema.parse(
      await (await t.call('/admin/mail/welcome', { token: admin })).json(),
    );
    const next = { ...cur, subject: 'Chào mừng tới OPC Hub!', showGuide: true };
    const put = await t.call('/admin/mail/welcome', { method: 'PUT', token: admin, json: next });
    expect(welcomeMailSchema.parse(await put.json()).subject).toBe('Chào mừng tới OPC Hub!');
    const again = welcomeMailSchema.parse(
      await (await t.call('/admin/mail/welcome', { token: admin })).json(),
    );
    expect(again.showGuide).toBe(true);
    const to = `wel-${Date.now().toString(36)}@test.opchub.vn`;
    const res = await t.call('/admin/mail/welcome/test', {
      method: 'POST',
      token: admin,
      json: { to },
    });
    expect(res.status).toBe(202);
    const job = mailJobSchema.parse(await res.json());
    const row = await t.prisma.db.mailLog.findUniqueOrThrow({ where: { id: job.jobId } });
    expect(row).toMatchObject({ to, subject: 'Chào mừng tới OPC Hub!', kind: 'test' });
    expect(row.bodyHtml).toContain('bgcolor="#0B1F4D"');
    expect(row.bodyHtml).toContain('Đăng nhập');
    const mod = await tokenOf(t, await createUser(t, { systemRole: 'moderator' }));
    expect((await t.call('/admin/mail/welcome', { token: mod })).status).toBe(403);
  });

  it('hạn mức ngày: vượt → false + hẹn nửa đêm VN; ngày VN tính đúng múi giờ', async () => {
    const now = new Date('2026-10-17T18:30:00Z'); // 01:30 ngày 18 giờ VN
    const d = vnDay(now);
    expect(d.day).toBe('2026-10-18');
    expect(d.nextMidnight.toISOString()).toBe('2026-10-18T17:00:00.000Z');
    await t.app.get(RedisService).client.del(`mail:daily:${d.day}`);
    const q = t.app.get(DailyQuota);
    expect(await q.take(2, now)).toEqual({ ok: true });
    expect(await q.take(2, now)).toEqual({ ok: true });
    expect(await q.take(2, now)).toEqual({ ok: false, retryAt: d.nextMidnight });
    await t.app.get(RedisService).client.del(`mail:daily:${d.day}`);
  });

  it('event.registered → mail xác nhận kind event, gọi lại không gửi trùng; fake gửi được', async () => {
    const u = await createUser(t);
    const ev = await createEvent(t, { mode: 'offline' });
    await t.prisma.db.eventRegistration.create({
      data: { eventId: ev.id, userId: u.id, status: 'registered' },
    });
    const h = t.app.get(EventMailHandler);
    await h.registered({ eventId: ev.id, userId: u.id });
    await h.registered({ eventId: ev.id, userId: u.id });
    const logs = await t.prisma.db.mailLog.findMany({ where: { to: u.email, kind: 'event' } });
    expect(logs).toHaveLength(1);
    const first = logs[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect((await t.app.get(MailSenderService).send(first.id, false)).status).toBe('sent');
    expect(fake.lastTo(u.email)?.subject).toContain('Xác nhận đăng ký');
    expect(fake.lastTo(u.email)?.html).toContain('bgcolor="#0B1F4D"');
    await removeTestEvents(t);
  });
});
