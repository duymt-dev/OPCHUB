import { Controller, Get, Patch, Post, Param, Req, HttpCode } from '@nestjs/common';
import {
  botReplySettingsSchema,
  botReplySettingsPatchSchema,
  botReplyScanSchema,
  botReplyScanResultSchema,
  botReplyOverviewSchema,
  type BotReplySettings,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { BotReplyRunsService } from './bot-reply-runs.service';
import { BotReplySettingsService } from './bot-reply-settings.service';
import { BotReplyOverviewService } from './bot-reply-overview.service';

@Controller('admin/bot/replies')
export class BotReplyRunsController {
  constructor(
    private readonly runs: BotReplyRunsService,
    private readonly settings: BotReplySettingsService,
    private readonly overview: BotReplyOverviewService,
  ) {}

  @Get()
  @RequireAdmin('bots.view')
  async get() {
    return respond(botReplyOverviewSchema, await this.overview.get());
  }

  @Get('settings')
  @RequireAdmin('bots.view')
  async getSettings() {
    return respond(botReplySettingsSchema, await this.settings.get());
  }

  @Patch('settings')
  @RequireAdmin('bots.action')
  async patch(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(botReplySettingsPatchSchema) body: Partial<BotReplySettings>,
  ) {
    return respond(
      botReplySettingsSchema,
      await this.settings.patch({ id: user.sub, ip: req.ip ?? null }, body),
    );
  }

  @Get('run')
  @RequireAdmin('bots.view')
  async current() {
    return respond(botReplyScanResultSchema, { run: await this.runs.current() });
  }

  @Post('scan')
  @HttpCode(202)
  @RequireAdmin('bots.action')
  async scan(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(botReplyScanSchema) _body: Record<string, never>,
  ) {
    void _body; // The empty-command schema rejects extra client-supplied controls.
    return respond(botReplyScanResultSchema, {
      run: await this.runs.scan({ id: user.sub, ip: req.ip ?? null }),
    });
  }

  @Post(':id/stop')
  @HttpCode(200)
  @RequireAdmin('bots.action')
  async stop(@CurrentUser() user: AccessClaims, @Req() req: Request, @Param('id') id: string) {
    return respond(botReplyScanResultSchema, {
      run: await this.runs.stop({ id: user.sub, ip: req.ip ?? null }, id),
    });
  }
}
