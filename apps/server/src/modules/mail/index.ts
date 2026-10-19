export { DailyQuota, vnDay } from './daily-quota';
export { DEFAULT_PRIORITY, MAIL_PRIORITY, priorityOf } from './mail-priority';
export { EventMailHandler } from './event-mail.handler';
export { MailCoreModule, MailHttpModule } from './mail.module';
export { MailSenderService, type SendResult } from './mail-sender.service';
export { MailService } from './mail.service';
export { UnsubscribeToken } from './unsubscribe-token';
export {
  adminLoginMail,
  type AdminLoginMailInput,
  esc,
  otpMail,
  type RenderedMail,
  welcomeMail,
} from './templates';
export { emailChangedMail, emailChangeMail, maskEmail } from './templates-account';
export { WelcomeService } from './welcome.service';
