import { Module } from '@nestjs/common';
import { AdminMailController } from './controllers/admin-mail.controller';
import { DailyQuota } from './daily-quota';
import { EventMailHandler } from './event-mail.handler';
import { ReceiptMailHandler } from './receipt-mail.handler';
import { MailSenderService } from './mail-sender.service';
import { MailRepository } from './mail.repository';
import { MailService } from './mail.service';
import { MailAdminService } from './services/mail-admin.service';
import { SmtpConfigService } from './services/smtp-config.service';
import { SmtpTransport } from './smtp-transport';
import { UnsubscribeToken } from './unsubscribe-token';
import { WelcomeMailController } from './welcome-mail.controller';
import { WelcomeService } from './welcome.service';

const providers = [
  MailRepository,
  MailService,
  MailSenderService,
  WelcomeService,
  SmtpTransport,
  DailyQuota,
  EventMailHandler,
  ReceiptMailHandler,
  UnsubscribeToken,
];

/** Service cho mọi process (domain khác yêu cầu gửi mail; worker gửi) */
@Module({ providers, exports: providers })
export class MailCoreModule {}

@Module({
  imports: [MailCoreModule],
  controllers: [WelcomeMailController, AdminMailController],
  providers: [MailAdminService, SmtpConfigService],
})
export class MailHttpModule {}
