import { Controller, Get, Post, Put, Req } from '@nestjs/common';
import {
  llmConfigSchema,
  llmConfigUpdateSchema,
  llmConfigVerifySchema,
  llmConfigVerifyResultSchema,
  type LlmConfigUpdate,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { CurrentUser, RequireAdmin, type AccessClaims } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { LlmConfigService } from './llm-config.service';

@Controller('admin/settings/llm')
@RequireAdmin('settings.general')
export class LlmConfigController {
  constructor(private readonly config: LlmConfigService) {}

  @Get()
  async get() {
    return respond(llmConfigSchema, await this.config.get());
  }

  @Put()
  async save(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    // Technical secret input must not be HTML-normalized after schema validation.
    @ZodBody(llmConfigUpdateSchema, { raw: true }) body: LlmConfigUpdate,
  ) {
    return respond(
      llmConfigSchema,
      await this.config.save({ id: user.sub, ip: req.ip ?? null }, body),
    );
  }

  @Post('verify')
  async verify(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(llmConfigVerifySchema, { raw: true }) body: LlmConfigUpdate,
  ) {
    return respond(
      llmConfigVerifyResultSchema,
      await this.config.verify({ id: user.sub, ip: req.ip ?? null }, body),
    );
  }
}
