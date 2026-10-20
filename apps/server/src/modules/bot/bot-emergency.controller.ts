import { Controller, HttpCode, Post, Req } from '@nestjs/common';
import { botEmergencyStoppedSchema } from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { BotKillSwitchService } from './services/bot-kill-switch.service';

@Controller('admin/bot')
export class BotEmergencyController {
  constructor(private readonly control: BotKillSwitchService) {}

  @RequireAdmin('bots.action')
  @Post('emergency-stop')
  @HttpCode(200)
  async stop(@CurrentUser() u: AccessClaims, @Req() req: Request) {
    return respond(
      botEmergencyStoppedSchema,
      await this.control.stop({ id: u.sub, ip: req.ip ?? null }),
    );
  }
}
