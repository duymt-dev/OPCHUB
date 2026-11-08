import { Controller, Get, Post, HttpCode, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  aiCallsFilterSchema,
  aiCallsQuerySchema,
  aiCallsPageSchema,
  exportJobSchema,
  type AiCallsFilter,
  type AiCallsQuery,
} from '@opchub/shared/api-domains';
import { CurrentUser, RequireAdmin, type AccessClaims } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { AiCallLogService } from '../services/ai-call-log.service';

@Controller('admin/settings/ai/calls')
@RequireAdmin('settings.general')
export class AiCallsController {
  constructor(private readonly logs: AiCallLogService) {}
  @Get() async page(@ZodQuery(aiCallsQuerySchema) query: AiCallsQuery) {
    return respond(aiCallsPageSchema, await this.logs.page(query));
  }
  @Post('export')
  @HttpCode(202)
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(aiCallsFilterSchema) filters: AiCallsFilter,
  ) {
    return respond(
      exportJobSchema,
      await this.logs.request({ id: user.sub, ip: req.ip ?? null }, filters),
    );
  }
}
