import { Controller, Get, Patch, Req } from '@nestjs/common';
import {
  botSchedulePatchSchema,
  botScheduleResponseSchema,
  type BotSchedulePatch,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { BotScheduleService } from './bot-schedule.service';

@Controller('admin/bot/schedule')
export class BotScheduleController {
  constructor(private readonly schedule: BotScheduleService) {}

  @Get()
  @RequireAdmin('bots.view')
  async get() {
    return respond(botScheduleResponseSchema, await this.schedule.get());
  }

  @Patch()
  @RequireAdmin('bots.action')
  async patch(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(botSchedulePatchSchema) body: BotSchedulePatch,
  ) {
    return respond(
      botScheduleResponseSchema,
      await this.schedule.patch({ id: user.sub, ip: req.ip ?? null }, body),
    );
  }
}
