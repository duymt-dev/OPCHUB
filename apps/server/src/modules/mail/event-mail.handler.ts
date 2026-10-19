import { Inject, Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { ENV, type Env } from '@/common/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MailService } from './mail.service';
import { eventRegisteredMail, eventReminderMail } from './templates-event';

/**
 * Consumer outbox `event.registered` → mail xác nhận (kind `event`). Đã huỷ trước khi relay chạy
 * thì không gửi. Relay có thể gọi lại → khoá bằng `mail_logs` cùng (to, kind, subject) trong 1 giờ.
 */
@Injectable()
export class EventMailHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async registered(p: OutboxPayload<'event.registered'>, now = new Date()): Promise<void> {
    const [ev, user] = await Promise.all([
      this.prisma.db.event.findUnique({
        where: { id: p.eventId },
        select: {
          title: true,
          startsAt: true,
          mode: true,
          address: true,
          mapUrl: true,
          meetUrl: true,
          registrations: {
            where: { userId: p.userId, status: 'registered' },
            select: { userId: true },
          },
        },
      }),
      this.prisma.db.user.findUnique({
        where: { id: p.userId },
        select: { email: true, fullName: true },
      }),
    ]);
    if (!ev?.registrations.length || !user?.email) return;
    const r = eventRegisteredMail(ev, user.fullName, `${this.env.PORTAL_URL}/events/${p.eventId}`);
    const dup = await this.prisma.db.mailLog.findFirst({
      where: {
        to: user.email,
        kind: 'event',
        subject: r.subject,
        createdAt: { gte: new Date(now.getTime() - 3_600_000) },
      },
      select: { id: true },
    });
    if (dup) return;
    await this.prisma.db.$transaction((tx) =>
      this.mail.request(tx, { to: user.email, kind: 'event', subject: r.subject, html: r.html }),
    );
  }

  /**
   * NA-23 `event.reminder_due` → một lô mail nhắc cho mọi người còn `registered` (1 query lấy người
   * nhận). Scheduler chỉ phát một lần mỗi sự kiện (`reminded_at`); relay gọi lại thì bỏ người đã có
   * mail cùng tiêu đề (1 query).
   */
  async reminder(p: OutboxPayload<'event.reminder_due'>): Promise<void> {
    const ev = await this.prisma.db.event.findUnique({
      where: { id: p.eventId },
      select: {
        title: true,
        startsAt: true,
        mode: true,
        address: true,
        mapUrl: true,
        meetUrl: true,
      },
    });
    if (!ev) return;
    const people = await this.prisma.db.$queryRaw<{ email: string; full_name: string }[]>`
      SELECT u.email::text AS email, u.full_name
      FROM event_registrations r JOIN users u ON u.id = r.user_id
      WHERE r.event_id = ${p.eventId} AND r.status = 'registered'
        AND u.status = 'active' AND u.deleted_at IS NULL`;
    if (!people.length) return;
    const link = `${this.env.PORTAL_URL}/events/${p.eventId}`;
    const subject = eventReminderMail(ev, '', link).subject;
    const sent = new Set(
      (
        await this.prisma.db.mailLog.findMany({
          where: { kind: 'event', subject, to: { in: people.map((x) => x.email) } },
          select: { to: true },
        })
      ).map((m) => m.to),
    );
    const mails = people
      .filter((x) => !sent.has(x.email))
      .map((x) => {
        const r = eventReminderMail(ev, x.full_name, link);
        return { to: x.email, kind: 'event' as const, subject: r.subject, html: r.html };
      });
    if (mails.length) await this.prisma.db.$transaction((tx) => this.mail.requestMany(tx, mails));
  }
}
