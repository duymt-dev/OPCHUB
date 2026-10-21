import { Controller, HttpCode, Post, Req } from '@nestjs/common';
import {
  botEmergencyStoppedSchema,
  botHideMessagesSchema,
  botMessagesHiddenSchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { BotKillSwitchService } from './services/bot-kill-switch.service';
import { BotHideService } from './services/bot-hide.service';

@Controller('admin/bot')
export class BotEmergencyController {
  constructor(
    private readonly control: BotKillSwitchService,
    private readonly visibility: BotHideService,
  ) {}

  @RequireAdmin('bots.action')
  @Post('hide-messages')
  @HttpCode(200)
  async hide(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @ZodBody(botHideMessagesSchema) body: z.output<typeof botHideMessagesSchema>,
  ) {
    return respond(
      botMessagesHiddenSchema,
      await this.visibility.hide({ id: u.sub, ip: req.ip ?? null }, body.groupIds),
    );
  }

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
