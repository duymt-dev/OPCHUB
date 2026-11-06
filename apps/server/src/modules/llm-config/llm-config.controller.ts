import { Controller, Get, Post, Put, Req, Param, HttpCode } from '@nestjs/common';
import {
  aiSettingsResponseSchema,
  aiSettingsUpdateSchema,
  aiVerifySchema,
  aiVerifyResultSchema,
  aiProviderIdSchema,
  type AiSettingsUpdate,
  type AiVerify,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { CurrentUser, RequireAdmin, type AccessClaims } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { notFound } from '@/common/errors';
import { AiSettingsService } from './services/ai-settings.service';
@Controller('admin/settings/ai')
@RequireAdmin('settings.general')
export class LlmConfigController {
  constructor(private readonly config: AiSettingsService) {}
  @Get() async get() {
    return respond(aiSettingsResponseSchema, await this.config.get());
  }
  @Put() async save(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(aiSettingsUpdateSchema, { raw: true }) body: AiSettingsUpdate,
  ) {
    return respond(
      aiSettingsResponseSchema,
      await this.config.save({ id: user.sub, ip: req.ip ?? null }, body),
    );
  }
  @Post('providers/:id/verify')
  @HttpCode(200)
  async verify(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(aiVerifySchema, { raw: true }) body: AiVerify,
  ) {
    const parsed = aiProviderIdSchema.safeParse(id);
    if (!parsed.success) throw notFound();
    return respond(
      aiVerifyResultSchema,
      await this.config.verify({ id: user.sub, ip: req.ip ?? null }, parsed.data, body),
    );
  }
}
