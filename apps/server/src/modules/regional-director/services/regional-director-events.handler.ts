import { Inject, Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { REGIONAL_LABELS } from '@opchub/shared/api-domains';
import { ENV, type Env } from '@/common/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MemberDirectory } from '@/modules/account';
import {
  MailService,
  regionalAppointedMail,
  regionalRevokedMail,
  regionalRevokeText,
} from '@/modules/mail';
import { NotificationService } from '@/modules/notification';

@Injectable()
export class RegionalDirectorEventsHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MemberDirectory,
    private readonly mail: MailService,
    private readonly notifications: NotificationService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async appointed(p: OutboxPayload<'regional_director.appointed'>, id: string) {
    const member = await this.members.byId(p.userId);
    if (!member) return;
    const mail = regionalAppointedMail(p.region, p.provinces, this.env.PORTAL_URL);
    await this.prisma.db.$transaction((tx) =>
      this.mail.requestOnce(tx, `regional-mail-${id}`, {
        to: member.email,
        kind: 'regional_director',
        ...mail,
      }),
    );
    await this.notifications.notify([
      {
        id: `regional-notification-${id}`,
        userId: p.userId,
        type: 'system',
        title: `Bạn được bổ nhiệm làm GĐ Vùng ${REGIONAL_LABELS[p.region]}`,
        body: 'Miễn phí thành viên trong thời gian làm GĐ Vùng. Xem tab Vùng của tôi trong Mạng lưới Affiliate.',
        link: '/affiliate',
      },
    ]);
  }

  async revoked(p: OutboxPayload<'regional_director.revoked'>, id: string) {
    const member = await this.members.byId(p.userId);
    if (!member) return;
    const mail = regionalRevokedMail(p.region, p.validUntil, p.revokedAt);
    await this.prisma.db.$transaction((tx) =>
      this.mail.requestOnce(tx, `regional-mail-${id}`, {
        to: member.email,
        kind: 'regional_director',
        ...mail,
      }),
    );
    await this.notifications.notify([
      {
        id: `regional-notification-${id}`,
        userId: p.userId,
        type: 'system',
        title: `Kết thúc vai trò GĐ Vùng ${REGIONAL_LABELS[p.region]}`,
        body: regionalRevokeText(p.validUntil),
        link: '/affiliate',
      },
    ]);
  }
}
