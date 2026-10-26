import { Controller, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import { type OnboardingMail, onboardingMailSchema } from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { OnboardingRemindService, type RemindActor } from '../services/onboarding-remind.service';

const actorOf = (u: AccessClaims, req: Request): RemindActor => ({ id: u.sub, ip: req.ip ?? null });

/** AD-02 "Nhắc" (D-88) + mẫu email nhắc tạm ở Email tự động */
@Controller('admin')
export class AdminOnboardingController {
  constructor(private readonly remind: OnboardingRemindService) {}

  @RequireAdmin('members.action')
  @Post('users/:id/onboarding-remind')
  @HttpCode(204)
  async send(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<void> {
    await this.remind.remind(actorOf(user, req), id);
  }

  @RequireAdmin('settings.mail')
  @Get('mail/onboarding')
  async template(): Promise<OnboardingMail> {
    return respond(onboardingMailSchema, await this.remind.template());
  }

  @RequireAdmin('settings.mail')
  @Put('mail/onboarding')
  async save(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(onboardingMailSchema) body: OnboardingMail,
  ): Promise<OnboardingMail> {
    return respond(onboardingMailSchema, await this.remind.saveTemplate(actorOf(user, req), body));
  }
}
