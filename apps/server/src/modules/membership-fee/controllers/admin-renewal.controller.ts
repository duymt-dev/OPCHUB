import { Controller, Get, Patch, Post, HttpCode, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  renewalSettingsSchema,
  renewalSettingsPatchSchema,
  renewalQuerySchema,
  renewalSendSchema,
  renewalSendResultSchema,
  renewalListSchema,
  type RenewalSettingsPatch,
  type RenewalQuery,
  type RenewalSend,
} from '@opchub/shared/api-domains';
import { CurrentUser, RequireAdmin, type AccessClaims } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { RenewalService } from '../services/renewal.service';
@Controller('admin')
export class AdminRenewalController {
  constructor(private readonly renewal: RenewalService) {}
  @Get('settings/renewal')
  @RequireAdmin('settings.mail')
  async config() {
    return respond(renewalSettingsSchema, await this.renewal.config());
  }
  @Patch('settings/renewal')
  @RequireAdmin('settings.mail')
  async patch(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @ZodBody(renewalSettingsPatchSchema) body: RenewalSettingsPatch,
  ) {
    return respond(
      renewalSettingsSchema,
      await this.renewal.patch({ id: u.sub, ip: req.ip ?? null }, body),
    );
  }
  @Get('renewal/members')
  @RequireAdmin('settings.mail')
  async list(@ZodQuery(renewalQuerySchema) q: RenewalQuery) {
    return respond(renewalListSchema, await this.renewal.list(q));
  }
  @Post('renewal/send')
  @HttpCode(200)
  @RequireAdmin('settings.mail')
  async send(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @ZodBody(renewalSendSchema) body: RenewalSend,
  ) {
    return respond(
      renewalSendResultSchema,
      await this.renewal.send({ id: u.sub, ip: req.ip ?? null }, body),
    );
  }
}
