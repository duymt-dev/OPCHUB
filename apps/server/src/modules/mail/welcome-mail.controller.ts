import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import { type WelcomeMailPreview, welcomeMailPreviewSchema } from '@opchub/shared/api-domains';
import type { Response } from 'express';
import { type AccessClaims, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { WelcomeService } from './welcome.service';

/** `GET /me/welcome-mail` — 204 khi không còn mail chào mừng chưa xem */
@Controller('me/welcome-mail')
export class WelcomeMailController {
  constructor(private readonly welcome: WelcomeService) {}

  @SkipMembershipFee()
  @Get()
  @HttpCode(200)
  async take(
    @CurrentUser() user: AccessClaims,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WelcomeMailPreview | undefined> {
    const mail = await this.welcome.take(user.sub);
    if (!mail) {
      res.status(204);
      return undefined;
    }
    return respond(welcomeMailPreviewSchema, mail);
  }
}
