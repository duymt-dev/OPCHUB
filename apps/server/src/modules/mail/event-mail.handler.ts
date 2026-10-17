import { Inject, Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { ENV, type Env } from '@/common/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MailService } from './mail.service';
import { eventRegisteredMail } from './templates-event';

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
}
