import { FakeMailProvider } from '@opchub/integrations';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAIL } from '@/common/integrations';
import { OutboxRelayService } from '@/common/outbox';
import { MailCoreModule, MailSenderService, MailService } from '@/modules/mail';
import { MailProcessor } from '@/worker/processors/mail.processor';
import { createTestApp, type TestApp } from '../setup/test-app';

/** Luồng gửi: request (tx) → outbox → MailSenderService → adapter; body xoá sau khi gửi */
describe('mail (TIP-B11)', () => {
  let t: TestApp;
  const fake = new FakeMailProvider();

  beforeAll(async () => {
    t = await createTestApp({
      imports: [MailCoreModule],
      providers: [MailProcessor],
      overrides: [[MAIL, fake]],
    });
  });
  afterAll(async () => {
    await t.close();
  });

  const to = () => `mail-${Date.now().toString(36)}@test.opchub.vn`;

  it('request ghi mail_logs + outbox cùng tx; send → sent, body null; gửi lại là no-op', async () => {
    const mail = t.app.get(MailService);
    const sender = t.app.get(MailSenderService);
    const addr = to();
    const id = await t.prisma.db.$transaction((tx) =>
      mail.request(tx, { to: addr, kind: 'test', subject: 'Thử', html: '<p>xin chào</p>' }),
    );
    const ev = await t.prisma.db.outboxEvent.findFirst({
      where: { type: 'mail.requested', payload: { equals: { mailLogId: id } } },
    });
    expect(ev).not.toBeNull();

    await sender.send(id, false);
    await sender.send(id, false);
    const row = await t.prisma.db.mailLog.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe('sent');
    expect(row.bodyHtml).toBeNull();
    expect(fake.sent.filter((m) => m.to === addr)).toHaveLength(1);
  });

  it('transaction rollback → không có mail_logs lẫn outbox', async () => {
    const mail = t.app.get(MailService);
    const addr = to();
    await expect(
      t.prisma.db.$transaction(async (tx) => {
        await mail.request(tx, { to: addr, kind: 'test', subject: 'x', html: 'x' });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(await t.prisma.db.mailLog.count({ where: { to: addr } })).toBe(0);
  });

  it('adapter lỗi lần cuối → failed, ghi lỗi, body null', async () => {
    const mail = t.app.get(MailService);
    const sender = t.app.get(MailSenderService);
    const addr = to();
    const id = await t.prisma.db.$transaction((tx) =>
      mail.request(tx, { to: addr, kind: 'test', subject: 'x', html: 'x' }),
    );
    const orig = fake.send.bind(fake);
    fake.send = () => Promise.reject(new Error('SMTP down'));
    await expect(sender.send(id, true)).rejects.toThrow('SMTP down');
    fake.send = orig;
    const row = await t.prisma.db.mailLog.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({
      status: 'failed',
      attempts: 1,
      bodyHtml: null,
      error: 'SMTP down',
    });
  });

  it('đầu-cuối: relay outbox → queue mail → worker gửi → sent', async () => {
    const mail = t.app.get(MailService);
    const relay = t.app.get(OutboxRelayService);
    const addr = to();
    const id = await t.prisma.db.$transaction((tx) =>
      mail.request(tx, { to: addr, kind: 'test', subject: 'E2E', html: '<p>e2e</p>' }),
    );
    while ((await relay.relayOnce()) > 0);
    const deadline = Date.now() + 10_000;
    let status = 'queued';
    while (status === 'queued' && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
      status = (await t.prisma.db.mailLog.findUniqueOrThrow({ where: { id } })).status;
    }
    expect(status).toBe('sent');
    expect(fake.lastTo(addr)?.subject).toBe('E2E');
  });
});
