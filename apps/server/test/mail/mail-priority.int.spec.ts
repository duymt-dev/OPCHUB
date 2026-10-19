import { FakeMailProvider, type MailProvider } from '@opchub/integrations';
import { MAIL_ATTEMPTS, MAIL_RETRY_DELAYS_MS } from '@opchub/shared/queues';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MAIL } from '@/common/integrations';
import { mailBackoff } from '@/common/queue';
import { DailyQuota, MailSenderService, MailService, vnDay } from '@/modules/mail';
import { SmtpTransport } from '@/modules/mail/smtp-transport';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * NA-05 (REQ-205): ưu tiên OTP + hạn mức dành riêng, chiến dịch vượt hạn mức dời 08:00 VN ngày sau,
 * thử lại 1/5/15 phút rồi `failed`. Thời gian truyền `now` — không phụ thuộc giờ thật.
 */
describe('mail NA-05 — ưu tiên, hạn mức, thử lại (REQ-205)', () => {
  let t: TestApp;
  const fake = new FakeMailProvider();
  let limit: number | null = null;
  let provider: MailProvider = fake;
  const transport = {
    resolve: () =>
      Promise.resolve({
        provider,
        from: { name: 'OPC Hub', email: 'no-reply@opchub.community' },
        dailyLimit: limit,
      }),
    reset: () => undefined,
  };
  // 01:30 ngày 18/10/2026 giờ VN
  const now = new Date('2026-10-17T18:30:00Z');
  const day = vnDay(now);

  beforeAll(async () => {
    t = await createTestApp({
      overrides: [
        [MAIL, fake],
        [SmtpTransport, transport],
      ],
    });
  });
  beforeEach(async () => {
    limit = null;
    provider = fake;
    await t.redis.client.del(`mail:daily:${day.day}`);
  });
  afterAll(async () => {
    await t.redis.client.del(`mail:daily:${day.day}`);
    await t.prisma.db.mailLog.deleteMany({ where: { to: { endsWith: '@na05.opchub.vn' } } });
    await t.close();
  });

  const to = (k: string) => `${k}-${Date.now().toString(36)}@na05.opchub.vn`;
  const request = (kind: 'otp' | 'campaign' | 'welcome' | 'fee_reminder', addr = to(kind)) =>
    t.prisma.db.$transaction((tx) =>
      t.app.get(MailService).request(tx, { to: addr, kind, subject: kind, html: '<p>x</p>' }),
    );

  it('REQ-205 NA-05 mail_logs.priority + outbox mang priority theo loại thư', async () => {
    const ids = await Promise.all([request('otp'), request('welcome'), request('campaign')]);
    const rows = await t.prisma.db.mailLog.findMany({
      where: { id: { in: ids } },
      select: { kind: true, priority: true },
    });
    expect(Object.fromEntries(rows.map((r) => [r.kind, r.priority]))).toEqual({
      otp: 1,
      welcome: 3,
      campaign: 5,
    });
    const ev = await t.prisma.db.outboxEvent.findFirst({
      where: { type: 'mail.requested', payload: { path: ['mailLogId'], equals: ids[0] } },
      select: { payload: true },
    });
    expect(ev?.payload).toEqual({ mailLogId: ids[0], priority: 1 });
  });

  it('REQ-205 NA-05 OTP ưu tiên khi chạm hạn mức (reserve)', async () => {
    // dailyLimit 100, reserve 20 (mặc định), đã gửi 80 thư thường
    limit = 100;
    await t.redis.client.set(`mail:daily:${day.day}`, '80');
    const sender = t.app.get(MailSenderService);
    const fee = await request('fee_reminder');
    const otp = await request('otp');
    const fr = await sender.send(fee, false, now);
    expect(fr).toEqual({ status: 'deferred', until: day.nextMidnight });
    expect(await sender.send(otp, false, now)).toEqual({ status: 'sent' });
    expect(await t.redis.client.get(`mail:daily:${day.day}`)).toBe('81');
    // OTP dùng được tới đúng `limit`; vượt cả `limit` → nửa đêm VN (hành vi cũ)
    await t.redis.client.set(`mail:daily:${day.day}`, '100');
    const otp2 = await request('otp');
    expect(await sender.send(otp2, false, now)).toEqual({
      status: 'deferred',
      until: day.nextMidnight,
    });
    const q = t.app.get(DailyQuota);
    expect(await q.take(100, now, { priority: 1, reserve: 20 })).toMatchObject({ ok: false });
  });

  it('REQ-205 chiến dịch vượt hạn mức dời 08:00 VN ngày sau', async () => {
    limit = 100;
    await t.redis.client.set(`mail:daily:${day.day}`, '80');
    const sender = t.app.get(MailSenderService);
    const camp = await request('campaign');
    const otp = await request('otp');
    const r = await sender.send(camp, false, now);
    // 08:00 ngày 19/10 giờ VN = 01:00Z ngày 19/10
    expect(day.nextMorning.toISOString()).toBe('2026-10-19T01:00:00.000Z');
    expect(r).toEqual({ status: 'deferred', until: day.nextMorning });
    const row = await t.prisma.db.mailLog.findUniqueOrThrow({ where: { id: camp } });
    // Không tính lần thử, vẫn chờ, có mốc gửi lại
    expect(row).toMatchObject({ status: 'queued', attempts: 0, nextAttemptAt: day.nextMorning });
    expect(await sender.send(otp, false, now)).toEqual({ status: 'sent' });
  });

  it('REQ-205 thử lại 1/5/15 phút rồi failed', async () => {
    expect(MAIL_ATTEMPTS).toBe(4);
    expect([1, 2, 3].map((n) => mailBackoff(n))).toEqual([60_000, 300_000, 900_000]);
    provider = {
      name: 'down',
      send: () => Promise.reject(new Error('SMTP 421 tạm thời không nhận')),
      verify: () => Promise.resolve(),
    };
    const sender = t.app.get(MailSenderService);
    const id = await request('fee_reminder');
    let at = now.getTime();
    const seen: number[] = [];
    for (let attempt = 1; attempt <= MAIL_ATTEMPTS; attempt += 1) {
      await expect(sender.send(id, attempt === MAIL_ATTEMPTS, new Date(at))).rejects.toThrow(
        'SMTP 421',
      );
      const row = await t.prisma.db.mailLog.findUniqueOrThrow({ where: { id } });
      expect(row.attempts).toBe(attempt);
      if (attempt < MAIL_ATTEMPTS) {
        const next = row.nextAttemptAt?.getTime() ?? 0;
        seen.push(next - at);
        at = next;
      }
    }
    expect(seen).toEqual([...MAIL_RETRY_DELAYS_MS]);
    const row = await t.prisma.db.mailLog.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({
      status: 'failed',
      attempts: 4,
      error: 'SMTP 421 tạm thời không nhận',
      nextAttemptAt: null,
    });
    // Thư giao dịch lỗi giữ nội dung để Admin gửi lại; OTP lỗi thì xoá
    expect(row.bodyHtml).not.toBeNull();
    const otp = await request('otp');
    await expect(sender.send(otp, true, now)).rejects.toThrow();
    expect(
      (await t.prisma.db.mailLog.findUniqueOrThrow({ where: { id: otp } })).bodyHtml,
    ).toBeNull();
  });
});
