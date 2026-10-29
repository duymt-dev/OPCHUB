import { Controller, Delete, Get, Post, Req } from '@nestjs/common';
import {
  botConversationTypeInputSchema,
  botConversationTypeParamsSchema,
  botConversationTypeSchema,
  botConversationTypesPageSchema,
  botConversationTypesQuerySchema,
  idResultSchema,
  type BotConversationTypeInput,
  type BotConversationTypesQuery,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodParams, ZodQuery } from '@/common/http/zod';
import { BotConversationTypesService } from './bot-conversation-types.service';

@Controller('admin/bot/conversation-types')
export class BotConversationTypesController {
  constructor(private readonly types: BotConversationTypesService) {}

  @Get()
  @RequireAdmin('bots.view')
  async list(@ZodQuery(botConversationTypesQuerySchema) query: BotConversationTypesQuery) {
    return respond(botConversationTypesPageSchema, await this.types.list(query));
  }

  @Post()
  @RequireAdmin('bots.action')
  async create(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(botConversationTypeInputSchema) input: BotConversationTypeInput,
  ) {
    return respond(
      botConversationTypeSchema,
      await this.types.create({ id: user.sub, ip: req.ip ?? null }, input),
    );
  }

  @Delete(':id')
  @RequireAdmin('bots.action')
  async remove(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodParams(botConversationTypeParamsSchema) { id }: { id: string },
  ) {
    return respond(
      idResultSchema,
      await this.types.remove({ id: user.sub, ip: req.ip ?? null }, id),
    );
  }
}
