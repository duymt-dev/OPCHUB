import { Controller, Get, HttpCode, Post, Put, Req } from '@nestjs/common';
import {
  type MailJob,
  mailJobSchema,
  type SmtpSettings,
  smtpSettingsSchema,
  smtpTestResultSchema,
  smtpTestSchema,
  smtpUpdateSchema,
  type SmtpVerify,
  smtpVerifySchema,
  type WelcomeMail,
  welcomeMailSchema,
  welcomeTestSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import type { MailActor } from '../services/mail-actor';
import { MailAdminService } from '../services/mail-admin.service';
import { SmtpConfigService } from '../services/smtp-config.service';

type TestResult = z.infer<typeof smtpTestResultSchema>;
const actorOf = (u: AccessClaims, req: Request): MailActor => ({ id: u.sub, ip: req.ip ?? null });

/** Mail chào mừng + SMTP (`s.cfg`, D-13/D-47) */
@Controller('admin')
export class AdminMailController {
  constructor(
    private readonly mail: MailAdminService,
    private readonly smtp: SmtpConfigService,
  ) {}

  @RequireAdmin('settings.mail')
  @Get('mail/welcome')
  async welcome(): Promise<WelcomeMail> {
    return respond(welcomeMailSchema, await this.mail.welcome());
  }

  @RequireAdmin('settings.mail')
  @Put('mail/welcome')
  async saveWelcome(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(welcomeMailSchema) body: WelcomeMail,
  ): Promise<WelcomeMail> {
    return respond(welcomeMailSchema, await this.mail.saveWelcome(actorOf(user, req), body));
  }

  @RequireAdmin('settings.mail')
  @Post('mail/welcome/test')
  @HttpCode(202)
  async testWelcome(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(welcomeTestSchema) body: z.output<typeof welcomeTestSchema>,
  ): Promise<MailJob> {
    return respond(mailJobSchema, await this.mail.testWelcome(actorOf(user, req), body.to));
  }

  @RequireAdmin('settings.mail')
  @Get('smtp')
  async getSmtp(): Promise<SmtpSettings> {
    return respond(smtpSettingsSchema, await this.smtp.get());
  }

  @RequireAdmin('settings.mail')
  @Put('smtp')
  async putSmtp(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(smtpUpdateSchema) body: z.output<typeof smtpUpdateSchema>,
  ): Promise<SmtpSettings> {
    return respond(smtpSettingsSchema, await this.smtp.update(actorOf(user, req), body));
  }

  @RequireAdmin('settings.mail')
  @Post('smtp/verify')
  @HttpCode(200)
  async verify(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(smtpVerifySchema) body: SmtpVerify,
  ): Promise<TestResult> {
    return respond(smtpTestResultSchema, await this.smtp.verify(actorOf(user, req), body));
  }

  @RequireAdmin('settings.mail')
  @Post('smtp/test')
  @HttpCode(200)
  async test(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(smtpTestSchema) body: z.output<typeof smtpTestSchema>,
  ): Promise<TestResult> {
    return respond(smtpTestResultSchema, await this.smtp.test(actorOf(user, req), body.to));
  }
}
