import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import type { MailJob, WelcomeMail } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AppSettingsService } from '@/modules/settings';
import { MailService } from '../mail.service';
import { welcomeMail } from '../templates';
import type { MailActor } from './mail-actor';

/** Mẫu mail chào mừng (D-47) — đọc/ghi `app_settings.welcome_mail`, gửi thử qua outbox */
@Injectable()
export class MailAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppSettingsService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  welcome(): Promise<WelcomeMail> {
    return this.settings.welcomeMail();
  }

  async saveWelcome(actor: MailActor, tpl: WelcomeMail): Promise<WelcomeMail> {
    await this.prisma.db.$transaction(async (tx: DbTx) => {
      const value = tpl as Prisma.InputJsonValue;
      await tx.appSetting.upsert({
        where: { key: 'welcome_mail' },
        create: { key: 'welcome_mail', value },
        update: { value },
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'mail.welcome.update',
        entity: 'mail',
        entityId: 'welcome',
        tag: 'content',
        summary: 'cập nhật mẫu mail chào mừng',
        ip: actor.ip,
      });
    });
    await this.settings.invalidate('welcome_mail');
    return this.settings.welcomeMail();
  }

  /** 202: thư vào hàng đợi; jobId = id mail_logs */
  async testWelcome(actor: MailActor, to: string): Promise<MailJob> {
    const r = welcomeMail(await this.settings.welcomeMail(), 'bạn');
    const jobId = await this.prisma.db.$transaction(async (tx: DbTx) => {
      const id = await this.mail.request(tx, {
        to,
        kind: 'test',
        subject: r.subject,
        html: r.html,
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'mail.welcome.test',
        entity: 'mail',
        entityId: 'welcome',
        tag: 'content',
        summary: `gửi thử mail chào mừng tới ${to}`,
        ip: actor.ip,
      });
      return id;
    });
    return { jobId, status: 'queued', recipients: 1 };
  }
}
