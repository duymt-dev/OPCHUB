import { Controller, Get, Patch, Post, Req } from '@nestjs/common';
import {
  appNotifyPatchSchema,
  appNotifyTestResultSchema,
  appNotifySettingsSchema,
  type AppNotifyPatch,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { CurrentUser, RequireAdmin, type AccessClaims } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { AppNotifyService } from '../services/app-notify.service';
@Controller('admin/settings/app')
@RequireAdmin('settings.general')
export class AdminAppNotifyController {
  constructor(private readonly service: AppNotifyService) {}
  @Get()
  async get() {
    return respond(appNotifySettingsSchema, await this.service.get());
  }
  @Patch()
  async patch(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(appNotifyPatchSchema) body: AppNotifyPatch,
  ) {
    return respond(
      appNotifySettingsSchema,
      await this.service.patch({ id: user.sub, ip: req.ip ?? null }, body),
    );
  }
  @Post('test')
  async test(@CurrentUser() user: AccessClaims, @Req() req: Request) {
    return respond(
      appNotifyTestResultSchema,
      await this.service.test({ id: user.sub, ip: req.ip ?? null }),
    );
  }
}
