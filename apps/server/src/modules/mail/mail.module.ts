import { Module } from '@nestjs/common';
import { MailSenderService } from './mail-sender.service';
import { MailRepository } from './mail.repository';
import { MailService } from './mail.service';
import { WelcomeMailController } from './welcome-mail.controller';
import { WelcomeService } from './welcome.service';

const providers = [MailRepository, MailService, MailSenderService, WelcomeService];

/** Service cho mọi process (domain khác yêu cầu gửi mail; worker gửi) */
@Module({ providers, exports: providers })
export class MailCoreModule {}

@Module({ imports: [MailCoreModule], controllers: [WelcomeMailController] })
export class MailHttpModule {}
